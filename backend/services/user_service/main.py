import anthropic
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
        "personality": personality_label(p_dict)
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

    profile.review_count += 1
    db.commit()

    p_dict = {d: getattr(profile, d) for d in FLAVOR_DIMS}
    label = personality_label(p_dict)
    print(f"\033[92m[USER] New Personality Label: {label}\033[0m")
    
    return {
        "user_id": payload.user_id,
        "profile": p_dict,
        "review_count": profile.review_count,
        "personality": label
    }

@app.get("/flavor-profiles/{user_id}/recommendations")
def get_recommendations(user_id: str, db: Session = Depends(get_db)):
    # 1. Look up the REAL flavor profile for this user. Same query get_flavor_profile() uses
    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    # 2. Everything below is still mocked for now
    cities = ["New York", "Phoenix", "Tokyo"]
    saves = 47
    top_cuisines = ["Mexican (8)", "Japanese (6)", "French (4)", "Chinese (3)"]
    avg_rating = 4.4
    five_star_pct = 42
    four_half_pct = 28
    four_star_pct = 0
    three_half_pct = 20
    three_star_pct = 10
    critic_label = "Tough Critic"
    poorly_rated_cuisines = ["Italian"]
    
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
    Saves received: {saves}

- Top cuisines logged: {top_cuisines}
- Rating breakdown: Average {avg_rating}, Critic Personality: {critic_label}
- Cuisines rated poorly: {poorly_rated_cuisines}

Task: Recommend exactly 3 dishes matching this profile. Return only valid JSON, no markdown.

Output format:
{{
  "insight": "...",
  "recommendations": [
    {{"dish": "...", "restaurant": "...", "city": "...", "match": 95, "tags": ["...", "..."], "reason": "...", "chemistryInsight": "..."}}
  ]
}}
"""
    # 4. Call Claude
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    # 5. Clean and parse the response 
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
        
    return json.loads(raw)