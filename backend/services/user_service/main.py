from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Import shared DB setup
from shared.database import get_db, engine
from services.user_service.db import models
from services.user_service.core.flavor_math import (
    FLAVOR_DIMS, update_dimension, adaptive_alpha, personality_label
)

# Optional: Auto-create tables (good for dev, but we already have an init_db script and migrations)
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User & Profile Service")

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
    user = db.query(models.User).filter(models.User.id == payload.id).first()
    if not user:
        user = models.User(id=payload.id)
        db.add(user)
    
    if payload.username is not None: user.username = payload.username
    if payload.display_name is not None: user.display_name = payload.display_name
    if payload.bio is not None: user.bio = payload.bio
    if payload.avatar_url is not None: user.avatar_url = payload.avatar_url
    
    # Ensure they have a flavor profile instantly
    if not user.flavor_profile:
        profile = models.FlavorProfile(user_id=user.id)
        db.add(profile)

    db.commit()
    return {"success": True}

@app.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
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
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    profile = db.query(models.FlavorProfile).filter(models.FlavorProfile.user_id == payload.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Ensure User is created.")

    # Apply adaptive alpha math
    alpha = adaptive_alpha(profile.review_count)

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

    profile.review_count += 1
    db.commit()

    p_dict = {d: getattr(profile, d) for d in FLAVOR_DIMS}
    return {
        "user_id": payload.user_id,
        "profile": p_dict,
        "review_count": profile.review_count,
        "personality": personality_label(p_dict)
    }
