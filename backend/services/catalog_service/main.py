import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from shared.database import get_db
from services.catalog_service.db import models
from services.catalog_service.integrations.google_places import get_nearby_restaurant

app = FastAPI(title="Catalog & Review Service")

# ── Request / Response Models ─────────────────────────────────────────────────

class ReviewPayload(BaseModel):
    user_id: str
    dish_id: str
    rating: float
    comment: Optional[str] = None
    media_url: Optional[str] = None

class LatLngPayload(BaseModel):
    lat: str
    lng: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/catalog/health")
def health_check():
    return {"status": "ok", "service": "catalog_service"}

@app.post("/venues/nearby")
def find_or_create_nearby_venue(payload: LatLngPayload, db: Session = Depends(get_db)):
    """Hits Google Places, finds a restaurant, and ensures it exists in the venues table."""
    name, vicinity, place_id = get_nearby_restaurant(payload.lat, payload.lng)
    
    if not place_id:
        return {"found": False, "message": "No restaurant found nearby"}

    # Check database
    venue = db.query(models.Venue).filter(models.Venue.google_place_id == place_id).first()
    
    if not venue:
        venue = models.Venue(
            name=name,
            google_place_id=place_id,
            vicinity=vicinity,
            lat=float(payload.lat),
            lng=float(payload.lng)
        )
        db.add(venue)
        db.commit()
        db.refresh(venue)

    return {"found": True, "venue": {"id": str(venue.id), "name": venue.name, "vicinity": venue.vicinity}}

@app.get("/venues/{venue_id}/dishes")
def get_venue_dishes(venue_id: str, db: Session = Depends(get_db)):
    """Fetch dishes associated with a venue."""
    dishes = db.query(models.Dish).filter(models.Dish.venue_id == venue_id).all()
    return {"dishes": [{"id": str(d.id), "name": d.name} for d in dishes]}

@app.post("/reviews")
async def create_review(payload: ReviewPayload, db: Session = Depends(get_db)):
    """Logs a review, ties it to media, and crucially, MUST ping the User Service to adjust the Flavor Profile."""
    
    # 1. Verify Dish
    dish = db.query(models.Dish).filter(models.Dish.id == payload.dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
        
    # 2. Create the Review
    review = models.Review(
        user_id=payload.user_id,
        dish_id=payload.dish_id,
        venue_id=dish.venue_id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # 3. Create Media reference if attached
    if payload.media_url:
        media = models.Media(review_id=review.id, media_url=payload.media_url)
        db.add(media)
        db.commit()

    # 4. Asynchronously notify the User Service to recalculate the flavor profile
    user_svc_url = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{user_svc_url}/flavor-profiles/update",
                json={
                    "user_id": payload.user_id,
                    "dish_id": str(payload.dish_id),
                    "rating": payload.rating,
                    "dish_base_spice": dish.base_spice,
                    "dish_base_acid": dish.base_acid,
                    "dish_base_umami": dish.base_umami,
                    "dish_base_sweet": dish.base_sweet,
                    "dish_base_texture": dish.base_texture
                }
            )
    except Exception as e:
        print(f"Warning: Failed to update flavor profile. {e}")

    return {"success": True, "review_id": str(review.id)}
