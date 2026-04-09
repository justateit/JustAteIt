import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import httpx

from shared.database import get_db
from services.catalog_service.db import models
from services.catalog_service.integrations.google_places import get_nearby_restaurant

app = FastAPI(title="Catalog & Review Service")

# ── Request / Response Models ─────────────────────────────────────────────────

class ReviewPayload(BaseModel):
    user_id: str
    dish_name: str
    venue_name: Optional[str] = None
    city: Optional[str] = None
    is_restaurant: bool = True
    rating: float
    sensory_notes: Optional[str] = None
    image_url: Optional[str] = None

class LatLngPayload(BaseModel):
    lat: float
    lng: float

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/catalog/health")
def health_check():
    return {"status": "ok", "service": "catalog_service"}

@app.post("/venues/nearby")
def find_or_create_nearby_venue(payload: LatLngPayload, db: Session = Depends(get_db)):
    """Hits Google Places, finds a restaurant, and returns it to the frontend."""
    print(f"\033[96m[CATALOG] Finding nearby venue for: {payload.lat}, {payload.lng}\033[0m")
    name, vicinity, place_id = get_nearby_restaurant(str(payload.lat), str(payload.lng))
    
    if not place_id:
        print("\033[93m[CATALOG] No nearby restaurant found.\033[0m")
        return {"found": False, "message": "No restaurant found nearby"}

    print(f"\033[92m[CATALOG] Found venue: {name} in {vicinity}\033[0m")

    return {
        "found": True, 
        "venue": {
            "name": name, 
            "vicinity": vicinity,
            "place_id": place_id
        }
    }

@app.get("/venues/{venue_id}/dishes")
def get_venue_dishes(venue_id: str, db: Session = Depends(get_db)):
    """Fetch dishes associated with a venue."""
    dishes = db.query(models.Dish).filter(models.Dish.venue_id == venue_id).all()
    return {"dishes": [{"id": str(d.id), "name": d.name} for d in dishes]}

@app.get("/reviews/{user_id}")
def get_user_reviews(user_id: str, db: Session = Depends(get_db)):
    """Fetches all past food logs for a user, sorted newest first."""
    print(f"\033[96m[CATALOG] Fetching journal for user: {user_id}\033[0m")
    
    reviews = db.query(models.Review)\
        .options(
            joinedload(models.Review.dish),
            joinedload(models.Review.venue),
            joinedload(models.Review.media)
        )\
        .filter(models.Review.user_id == user_id)\
        .order_by(models.Review.created_at.desc())\
        .all()

    result = []
    for r in reviews:
        # Get first media URL if exists
        media_url = r.media[0].media_url if r.media else None
        
        result.append({
            "id": str(r.id),
            "dish_name": r.dish.name if r.dish else "Unknown Dish",
            "venue_name": r.venue.name if r.venue else "Private Location",
            "city": r.venue.vicinity if r.venue else None,
            "rating": r.rating,
            "sensory_notes": r.comment,
            "image_url": media_url,
            "created_at": r.created_at.isoformat()
        })

    print(f"\033[92m[CATALOG] Successfully retrieved {len(result)} entries for user journal.\033[0m")
    return {"logs": result, "count": len(result)}

async def notify_user_service(user_id: str, dish_data: dict, rating: float):
    """Internal helper to hit the User Service asynchronously without blocking the main response."""
    user_svc_url = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
    print(f"\033[96m[CATALOG] Background task starting: Notifying User Service for user: {user_id}\033[0m")
    
    try:
        # We use a short timeout (5s) to ensure we don't hang the worker thread
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{user_svc_url}/flavor-profiles/update",
                json={
                    "user_id": user_id,
                    "dish_id": dish_data.get("id"),
                    "rating": rating,
                    "dish_base_spice": dish_data.get("spice", 0.5),
                    "dish_base_acid": dish_data.get("acid", 0.5),
                    "dish_base_umami": dish_data.get("umami", 0.5),
                    "dish_base_sweet": dish_data.get("sweet", 0.5),
                    "dish_base_texture": dish_data.get("texture", 0.5)
                }
            )
        print("\033[92m[CATALOG] Background task complete: Flavor profile update triggered.\033[0m")
    except Exception as e:
        print(f"\033[91m[CATALOG ERROR] Background task failed: {e}\033[0m")

@app.post("/reviews")
async def create_review(payload: ReviewPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Logs a review, handling lazy creation of venues and dishes."""
    print(f"\033[96m[CATALOG] Review Request Received: {payload.dish_name} by {payload.user_id}\033[0m")
    
    # 1. Handle Venue
    venue_id = None
    if payload.venue_name:
        venue = db.query(models.Venue).filter(models.Venue.name == payload.venue_name).first()
        if not venue:
            print(f"\033[93m[CATALOG] Lazy-creating new venue: {payload.venue_name}\033[0m")
            venue = models.Venue(
                name=payload.venue_name,
                vicinity=payload.city
            )
            db.add(venue)
            db.commit()
            db.refresh(venue)
        else:
            print(f"\033[92m[CATALOG] Found existing venue: {payload.venue_name}\033[0m")
        venue_id = venue.id

    # 2. Handle Dish
    dish = db.query(models.Dish).filter(
        models.Dish.name == payload.dish_name,
        models.Dish.venue_id == venue_id
    ).first()
    
    if not dish:
        print(f"\033[93m[CATALOG] Lazy-creating new dish: {payload.dish_name}\033[0m")
        dish = models.Dish(
            name=payload.dish_name,
            venue_id=venue_id
        )
        db.add(dish)
        db.commit()
        db.refresh(dish)
    else:
        print(f"\033[92m[CATALOG] Found existing dish: {payload.dish_name}\033[0m")

    # 3. Create the Review
    review = models.Review(
        user_id=payload.user_id,
        dish_id=dish.id,
        venue_id=venue_id,
        rating=payload.rating,
        comment=payload.sensory_notes
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # 4. Create Media reference if attached
    if payload.image_url:
        media = models.Media(review_id=review.id, media_url=payload.image_url)
        db.add(media)
        db.commit()

    # 5. Notify the User Service IN THE BACKGROUND
    dish_data = {
        "id": str(dish.id),
        "spice": dish.base_spice,
        "acid": dish.base_acid,
        "umami": dish.base_umami,
        "sweet": dish.base_sweet,
        "texture": dish.base_texture
    }
    background_tasks.add_task(notify_user_service, payload.user_id, dish_data, payload.rating)

    return {"success": True, "review_id": str(review.id)}
