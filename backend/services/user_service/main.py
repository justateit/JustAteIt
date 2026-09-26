import anthropic
import httpx
import os
import json

from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Import shared DB setup
from shared.database import get_db, engine
from services.user_service.db import models
from services.user_service.core.flavor_math import (
    FLAVOR_DIMS, update_dimension, adaptive_alpha, personality_label
)

# Plain-language names for the flavor dimensions. User testing found that diners
# did not know what "umami" or "acid" meant, so the raw dimension names never
# reach the reader — only these.
FLAVOR_GLOSS = {
    "spice":   "heat and spice",
    "acid":    "bright, tangy flavors",
    "umami":   "savory depth",
    "sweet":   "sweetness",
    "texture": "texture and crunch",
}

load_dotenv()

# Optional: Auto-create tables (good for dev, but we already have an init_db script and migrations)
# models.Base.metadata.create_all(bind=engine)
# Note: no create_all() here — the schema is owned by the versioned
# Supabase migrations in backend/supabase/migrations (see backend/README.md).

app = FastAPI(title="User & Profile Service")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ── Request / Response Models ─────────────────────────────────────────────────

class RatingPayload(BaseModel):
    user_id: str
    dish_id: str
    rating:  float   # 1-5 stars

    # For the microservice, the catalog service will likely send the base stats of the dish
    # alongside the rating so we don't have to do a cross-service HTTP call here,
    # OR we do a synchronous HTTP call to Catalog. We'll simulate passing it in for now.
    dish_base_spice: float = 0.5
    dish_base_acid: float = 0.5
    dish_base_umami: float = 0.5
    dish_base_sweet: float = 0.5
    dish_base_texture: float = 0.5

class ProfileResponse(BaseModel):
    user_id:      str
    profile:      Dict[str, float]
    review_count: int
    personality:  str
    points_count: int
    achieved_milestones: list[str]

class UserPayload(BaseModel):
    id:         str
    username:   Optional[str] = None
    display_name: Optional[str] = None
    bio:        Optional[str] = None
    avatar_url: Optional[str] = None

class DishRecommendation(BaseModel):
    dish:       str
    restaurant: str
    city:       str
    match:      int
    tags:       List[str]
    reason:     str

class RecommendationsOutput(BaseModel):
    insight:         str
    recommendations: List[DishRecommendation]
    breakdown:       str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/users/health")
def health_check():
    return {"status": "ok", "service": "user_service"}

@app.post("/users")
def upsert_user(payload: UserPayload, db: Session = Depends(get_db)):
    """Create or update a user profile via Clerk sync."""
    print(f"\033[96m[USER] Upserting user: {payload.id}\033[0m")
    user = db.query(models.User).filter(models.User.id == payload.id).first()
    if not user:
        print(f"\033[93m[USER] User {payload.id} not found, creating new record.\033[0m")
        user = models.User(id=payload.id)
        db.add(user)
    
    if payload.username is not None: user.username = payload.username
    if payload.display_name is not None: user.display_name = payload.display_name
    if payload.bio is not None: user.bio = payload.bio
    if payload.avatar_url is not None: user.avatar_url = payload.avatar_url
    
    # Ensure they have a flavor profile instantly
    if not user.flavor_profile:
        print(f"\033[92m[USER] Initializing first-time flavor profile for user {payload.id}\033[0m")
        profile = models.FlavorProfile(user_id=user.id)
        db.add(profile)

    db.commit()
    return {"success": True}

@app.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
         print(f"\033[91m[USER ERROR] Fetch failed: User {user_id} not found\033[0m")
         raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url
    }

@app.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Deletes a user account and all associated profile, review, and media data."""
    print(f"\033[91m[USER] Deleting user account and associated data: {user_id}\033[0m")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        print(f"\033[91m[USER ERROR] Delete failed: User {user_id} not found\033[0m")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Deleting the user record cascades to flavor_profile, reviews, media, and audit logs
    db.delete(user)
    db.commit()
    return {"success": True, "message": f"User {user_id} and all associated data have been permanently deleted."}

@app.get("/flavor-profiles/{user_id}", response_model=ProfileResponse)
def get_flavor_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    p_dict = {d: getattr(profile, d) for d in FLAVOR_DIMS}
    return {
        "user_id": user_id,
        "profile": p_dict,
        "review_count": profile.review_count,
        "personality": personality_label(p_dict),
        "points_count": profile.points_count,
        "achieved_milestones": json.loads(profile.achieved_milestones) if profile.achieved_milestones else [],
    }

@app.post("/flavor-profiles/update", response_model=ProfileResponse)
async def update_flavor_profile(payload: RatingPayload, db: Session = Depends(get_db)):
    """Core Algorithm: Adjusts user profile based on a rating and dish stats."""
    print(f"\033[96m[USER] Recalculating flavor profile for {payload.user_id} (Rating: {payload.rating})\033[0m")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == payload.user_id).first()
    if not profile:
        print(f"\033[91m[USER ERROR] Update failed: No profile found for {payload.user_id}\033[0m")
        raise HTTPException(status_code=404, detail="Profile not found. Ensure User is created.")

    # Apply adaptive alpha math
    alpha = adaptive_alpha(profile.review_count)
    print(f"\033[96m[USER] Adaptive Alpha: {alpha:.4f} (Experience: {profile.review_count})\033[0m")

    dish_stats = {
        "spice": payload.dish_base_spice,
        "acid": payload.dish_base_acid,
        "umami": payload.dish_base_umami,
        "sweet": payload.dish_base_sweet,
        "texture": payload.dish_base_texture
    }

    # Update dimensions in memory
    for dim in FLAVOR_DIMS:
        old_val = getattr(profile, dim)
        dish_val = dish_stats[dim]
        new_val = update_dimension(old_val, payload.rating, dish_val, alpha)
        setattr(profile, dim, new_val)
        # print(f"   -> {dim}: {old_val:.2f} -> {new_val:.2f}")

    profile.points_count += 10
    profile.review_count += 1
    profile.recommendations_stale = True

    logs = await fetch_user_logs(payload.user_id)
    stats = {
        "review_count": profile.review_count,
        "cities_visited": len({log["city"] for log in logs if log.get("city")}),
        "cuisines_tried": len({log["cuisine"] for log in logs if log.get("cuisine")}),
        "has_five_star": any(log.get("rating") == 5 for log in logs),
    }
    achieved = json.loads(profile.achieved_milestones) if profile.achieved_milestones else []
    for milestone in MILESTONES:
        if milestone["id"] not in achieved and milestone["condition"](stats):
            profile.points_count += milestone["points"]
            achieved.append(milestone["id"])
    profile.achieved_milestones = json.dumps(achieved)

    db.commit()

    p_dict = {d: getattr(profile, d) for d in FLAVOR_DIMS}
    label = personality_label(p_dict)
    print(f"\033[92m[USER] New Personality Label: {label}\033[0m")
    
    return {
        "user_id": payload.user_id,
        "profile": p_dict,
        "review_count": profile.review_count,
        "personality": label,
        "points_count": profile.points_count,
        "achieved_milestones": achieved
    }
    
def get_critic_label(avg: float) -> str:
    if avg >= 4:
        return "Enthusiast"
    if avg >= 3:
        return "Connoisseur"
    if avg >= 2:
        return "Tough Critic"
    if avg >= 1:
        return "Skeptic"
    if avg >= 0.1:
        return "Merciless"
    return "New Foodie"

MILESTONES = [
    {
        "id": "first_log",
        "title": "First Bite",
        "points": 25,
        "condition": lambda stats: stats["review_count"] >= 1,
    },
    {
        "id": "three_cities",
        "title": "City Hopper",
        "points": 50,
        "condition": lambda stats: stats["cities_visited"] >= 3,
    },
    {
        "id": "twenty_five_dishes",
        "title": "Dedicated Foodie",
        "points": 50,
        "condition": lambda stats: stats["review_count"] >= 25,
    },
    {
        "id": "five_cuisines",
        "title": "Flavor Explorer",
        "points": 50,
        "condition": lambda stats: stats["cuisines_tried"] >= 5,
    },
    {
        "id": "five_star_find",
        "title": "Five-Star Find",
        "points": 25,
        "condition": lambda stats: stats["has_five_star"],
    },
    {
        "id": "five_cities",
        "title": "World Traveler",
        "points": 75,
        "condition": lambda stats: stats["cities_visited"] >= 5,
    },
    {
        "id": "hundred_dishes",
        "title": "Century Club",
        "points": 100,
        "condition": lambda stats: stats["review_count"] >= 100,
    },
]

async def fetch_user_logs(user_id: str) -> list:
    """Fetches a user's dish logs from catalog_service. Returns [] on failure."""
    catalog_svc_url = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8002")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{catalog_svc_url}/reviews/{user_id}")
            response.raise_for_status()
            return response.json().get("logs", [])
    except Exception as e:
        print(f"Failed to fetch logs from catalog_service: {e}")
        return []

async def fetch_real_venues(cities: list, cuisines: list, limit: int = 60) -> list:
    """
    Real restaurants for these cities/cuisines, via catalog_service.

    One call covers every pair — the upstream venue APIs are slow and rate
    limited, so this must not be called in a loop. Returns [] on failure, which
    callers treat as "name no restaurant" rather than falling back to a guess.
    """
    catalog_svc_url = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8002")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{catalog_svc_url}/venues/search",
                params={
                    "cities": ",".join(cities),
                    "cuisines": ",".join(cuisines),
                    "limit": limit,
                },
            )
            response.raise_for_status()
            return response.json().get("venues", [])
    except Exception as e:
        print(f"Failed to fetch venues from catalog_service: {e}")
        return []

@app.get("/flavor-profiles/{user_id}/recommendations")
async def get_recommendations(user_id: str, exclude: str = "", db: Session = Depends(get_db)):
    # 1. Look up the REAL flavor profile for this user. Same query get_flavor_profile() uses
    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    excluded_dishes = [d.strip() for d in exclude.split(",") if d.strip()]
    is_refresh_request = bool(excluded_dishes)

    # Serve the cached picks when nothing has changed since they were generated
    # (no new log, no explicit refresh) — skips the Claude call entirely.
    if not is_refresh_request and not profile.recommendations_stale and profile.cached_recommendations:
        return json.loads(profile.cached_recommendations)

    logs = await fetch_user_logs(user_id)

    cities = sorted({log["city"] for log in logs if log.get("city")})

    # Per-cuisine stats: how often it was logged AND how well it was actually rated
    cuisine_stats = {}
    for log in logs:
        cuisine = log.get("cuisine")
        if not cuisine:
            continue
        stats = cuisine_stats.setdefault(cuisine, {"count": 0, "rating_sum": 0.0, "rated_count": 0})
        stats["count"] += 1
        if log.get("rating") is not None:
            stats["rating_sum"] += log["rating"]
            stats["rated_count"] += 1

    cuisine_ranked = sorted(
        cuisine_stats.items(),
        key=lambda item: (
            (item[1]["rating_sum"] / item[1]["rated_count"]) if item[1]["rated_count"] else 0,
            item[1]["count"],
        ),
        reverse=True,
    )
    top_rated_cuisines = [
        f"{name} (avg {round(s['rating_sum'] / s['rated_count'], 2)} over {s['count']} log{'s' if s['count'] != 1 else ''})"
        if s["rated_count"] else f"{name} ({s['count']} log{'s' if s['count'] != 1 else ''}, unrated)"
        for name, s in cuisine_ranked[:2]
    ]
    all_cuisines_by_frequency = [
        f"{name} ({s['count']})" for name, s in sorted(cuisine_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    ]

    # Build the list of restaurants Claude is allowed to name. The model can't be
    # trusted to know whether a business exists, so it never supplies one itself.
    #
    # Two sources, in this order:
    #   1. Venues this user has already logged. Each was resolved through
    #      Places/OSM when the meal was logged, so it's a real place, it's in a
    #      city they actually visit, and reusing it costs no network call.
    #   2. A search for more restaurants in their top cuisines.
    #
    # Source 1 comes first because it cannot fail. The public Overpass instance
    # behind source 2 is slow and often answers "server too busy", so when it was
    # the only source every recommendation came back with a blank venue.
    real_venues, seen_venues = [], set()
    allowed_venue_names = set()  # enforced after generation, not just requested
    for log in logs:
        name, city = log.get("venue_name"), log.get("city")
        if not name or name == "Private Location" or (name, city) in seen_venues:
            continue
        seen_venues.add((name, city))
        allowed_venue_names.add(name)
        real_venues.append(
            f"{name} — {log.get('cuisine') or 'unknown cuisine'} in {city or 'their area'} (already visited)"
        )

    for v in await fetch_real_venues(cities[:2], [name for name, _ in cuisine_ranked[:2]]):
        name, city = v.get("name"), v.get("city")
        if not name or (name, city) in seen_venues:
            continue
        seen_venues.add((name, city))
        allowed_venue_names.add(name)
        real_venues.append(f"{name} — {v.get('cuisine', '')} in {city}")

    print(f"\033[96m[USER] {len(real_venues)} venue(s) offered to the model: {sorted(allowed_venue_names)}\033[0m")

    ratings = [log["rating"] for log in logs if log.get("rating") is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0
    critic_label = get_critic_label(avg_rating)

    target_cuisine = cuisine_ranked[0][0] if cuisine_ranked else None

    # The flavor gap
    ranked_flavors = sorted(
        ((dim, getattr(profile, dim)) for dim in FLAVOR_DIMS),
        key=lambda kv: kv[1], reverse=True,
    )
    standout_flavor = (
        FLAVOR_GLOSS[ranked_flavors[0][0]]
        if len(ranked_flavors) > 1 and (ranked_flavors[0][1] - ranked_flavors[1][1]) >= 0.15
        else None
    )
    history_rule = (
        "- In the breakdown only, note once that their history is still short, and don't describe a settled pattern."
        if profile.review_count < 4
        else "- Don't comment on how much they have logged."
    )

    prompt = f"""
You recommend dishes at real restaurants based on a diner's history.

<diner>
- Cuisine to focus on (their highest rated): {target_cuisine or "not enough data"}
- Their top-rated cuisines: {", ".join(top_rated_cuisines) or "none yet"}
- They have logged {len(cuisine_stats)} distinct cuisine{"" if len(cuisine_stats) == 1 else "s"}. The most frequent are: {", ".join(all_cuisines_by_frequency) or "none yet"} (this list may be truncated — use the count above, never the length of this list)
- Meals logged: {profile.review_count} across {len(cities)} cit{"y" if len(cities) == 1 else "ies"} ({", ".join(cities) or "unknown"})
- How they rate: {avg_rating} average, {critic_label}
{f"- One taste that clearly stands out for them: {standout_flavor}" if standout_flavor else "- No single taste stands out for them yet, so do not claim one does."}
</diner>

<restaurants>
{chr(10).join(f"- {v}" for v in real_venues) if real_venues else "none found"}
</restaurants>

Recommend exactly 3 dishes.

THE RESTAURANT RULE, which outranks everything else below: every "restaurant" you output must be copied character for character from <restaurants>. Do not reword, reorder, shorten, or combine the names — "Sichuan Taste" must never become "Taste of Sichuan", and two listed names must never be merged into a third. A name that is close but not identical is treated as invented and thrown away, so the diner loses that recommendation entirely. If you cannot fill 3 dishes from distinct listed venues, use a listed venue twice with different dishes. Only if <restaurants> is empty may restaurant be "".

- Pick the restaurant first, then a dish it plausibly serves.
- Where the list gives you a choice, prefer venues NOT marked "(already visited)" so they discover somewhere new. A visited one is fine — but never write "already visited", "again", or "revisit".
- At least 2 of the 3 should be {target_cuisine or "their top-rated cuisine"}.
{f"- Do not recommend these dishes: {', '.join(excluded_dishes)}" if excluded_dishes else ""}

Style: short, plain, factual sentences. Never compliment the diner's taste, and never mention how these were chosen or where the data came from.
- Banned words: beautifully, remarkably, perfectly, delightful, nuanced, journey, philosophy, curiosity, sophisticated, honor.
{history_rule}

Fields:
- insight: 2 sentences, written TO the diner as "you" — never "this diner" or "they". The first on how widely they range, using the cuisine and meal counts given above and no other numbers. The second on where they eat, and whether that is one area or several.
- recommendations: per dish a "match" integer, 3-4 short tags, and "reason" — one sentence tying the dish to a cuisine or dish they have logged.
  Score "match" as: start at 70; add 15 if the dish is their focus cuisine, or 8 if it is another cuisine they rated 4+; add 10 if that cuisine averages 4.5 or better for them; subtract 10 if they have logged that cuisine only once. Keep it in 0-100.
- breakdown: 3-4 sentences, second person. Lead with the focus cuisine and what they rated it, then how their rating style shaped the picks. Do not re-describe the dishes, and do not repeat the insight.
"""
    # 4. Call Claude with a schema-constrained response — no manual JSON stripping/parsing needed
    response = client.messages.parse(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        temperature=0.35,
        messages=[{"role": "user", "content": prompt}],
        output_format=RecommendationsOutput,
    )
    result = response.parsed_output.model_dump()

    # Enforce the venue constraint in code
    for rec in result.get("recommendations", []):
        name = (rec.get("restaurant") or "").strip()
        if name and name not in allowed_venue_names:
            print(f"\033[91m[USER] Rejected unlisted venue from model: {name!r}\033[0m")
            rec["restaurant"] = ""

    profile.cached_recommendations = json.dumps(result)
    profile.recommendations_stale = False
    db.commit()
    return result