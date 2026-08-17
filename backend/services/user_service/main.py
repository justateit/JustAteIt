import anthropic
import httpx
import os
import json

from typing import Dict, Optional
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

load_dotenv()

# Optional: Auto-create tables (good for dev, but we already have an init_db script and migrations)
# models.Base.metadata.create_all(bind=engine)

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

class UserPayload(BaseModel):
    id:         str 
    username:   Optional[str] = None
    display_name: Optional[str] = None
    bio:        Optional[str] = None
    avatar_url: Optional[str] = None

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
        
    }

@app.post("/flavor-profiles/update", response_model=ProfileResponse)
def update_flavor_profile(payload: RatingPayload, db: Session = Depends(get_db)):
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
    db.commit()

    p_dict = {d: getattr(profile, d) for d in FLAVOR_DIMS}
    label = personality_label(p_dict)
    print(f"\033[92m[USER] New Personality Label: {label}\033[0m")
    
    return {
        "user_id": payload.user_id,
        "profile": p_dict,
        "review_count": profile.review_count,
        "personality": label,
        "points_count": profile.points_count
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

@app.get("/flavor-profiles/{user_id}/recommendations")
async def get_recommendations(user_id: str, exclude: str = "", db: Session = Depends(get_db)):
    # 1. Look up the REAL flavor profile for this user. Same query get_flavor_profile() uses
    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    logs = await fetch_user_logs(user_id)
    
    cities = sorted({log["city"] for log in logs if log.get("city")})
    
    cuisine_counts = {}
    for log in logs:
        cuisine = log.get("cuisine")
        if cuisine:
            cuisine_counts[cuisine] = cuisine_counts.get(cuisine, 0) + 1
    top_cuisines = [
        f"{name} ({count})"
        for name, count in sorted(cuisine_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    ratings = [log["rating"] for log in logs if log.get("rating") is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0
    critic_label = get_critic_label(avg_rating)
    
    excluded_dishes = [d.strip() for d in exclude.split(",") if d.strip()]
    
    prompt = f"""
Role: You are a culinary recommender with deep knowledge of restaurants, dishes, and flavor profiles.

User Profile:
- Flavor scores (0 to 1, higher means stronger preference):
    Spice: {profile.spice}
    Acid: {profile.acid}
    Umami: {profile.umami}
    Sweet: {profile.sweet}
    Texture: {profile.texture}

- Dining activity:
    Total logs: {profile.review_count}
    Cities visited: {cities}

- Top cuisines logged: {top_cuisines}
- Rating breakdown: Average {avg_rating}, Critic Personality: {critic_label}

{f"- Do NOT recommend any of these previously suggested dishes: {excluded_dishes}" if excluded_dishes else ""}

Task: Recommend exactly 3 dishes matching this profile. Return only valid JSON, no markdown.

Output format:
{{
  "insight": "1-2 sentence summary of the user's overall taste pattern",
  "recommendations": [
    {{"dish": "...", "restaurant": "...", "city": "...", "match": <integer 0-100 representing match confidence>, "tags": ["...", "..."], "reason": "1 brief sentence on why this dish fits their palate", "chemistryInsight": "1 brief sentence on the specific flavor chemistry (e.g. umami-fat pairing)"}}
  ],
    "breakdown":  "3-4 sentences, friendly and second-person, explaining the methodology behind the 3 picks above: which of their flavor dimensions weighed most heavily and why, and how their logged cuisines, cities, and rating pattern shaped selection. Name specific numbers from their profile. Do not re-describe the dishes themselves.",
}}
"""
    # 4. Call Claude
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        temperature=1.0, 
        messages=[{"role": "user", "content": prompt}],
    )

    # 5. Clean and parse the response 
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
        
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"\033[91m[RECS ERROR] Claude returned invalid JSON: {e}\033[0m")
        raise HTTPException(status_code=502, detail="Failed to generate recommendations. Please try again.")
        