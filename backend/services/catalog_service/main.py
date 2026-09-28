import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import httpx

from shared.database import get_db
from services.catalog_service.db import models
from services.catalog_service.integrations.google_places import get_nearby_restaurant
from services.catalog_service.recommendations import rank_and_diversify_feed

app = FastAPI(title="Catalog & Review Service")

# ── Request / Response Models ─────────────────────────────────────────────────

class ReviewPayload(BaseModel):
    user_id: str
    dish_name: str
    venue_name: Optional[str] = None
    city: Optional[str] = None
    cuisine: Optional[str] = None
    is_restaurant: bool = True
    rating: float
    sensory_notes: Optional[str] = None
    image_url: Optional[str] = None

class ReviewUpdatePayload(BaseModel):
    dish_name: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    rating: Optional[float] = None
    sensory_notes: Optional[str] = None
    image_url: Optional[str] = None

class LatLngPayload(BaseModel):
    lat: float
    lng: float
    
class DraftPayload(BaseModel):
    user_id: str
    dish_name: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    cuisine: Optional[str] = None
    is_restaurant: Optional[bool] = True
    rating: Optional[float] = None
    sensory_notes: Optional[str] = None
    image_url: Optional[str] = None

class DraftUpdatePayload(BaseModel):
    dish_name: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    cuisine: Optional[str] = None
    is_restaurant: Optional[bool] = None
    rating: Optional[float] = None
    sensory_notes: Optional[str] = None
    image_url: Optional[str] = None

class InteractionItem(BaseModel):
    user_id: str
    dish_id: Optional[str] = None
    venue_id: Optional[str] = None
    interaction_type: str  # 'impression', 'dwell', 'expand', 'save', 'skip', 'share'
    dwell_time_ms: int = 0
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class BatchInteractionPayload(BaseModel):
    interactions: List[InteractionItem]

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
            "cuisine": r.dish.cuisine if r.dish else None,
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
        models.Dish.venue_id == venue_id,
    ).first()

    if not dish:
        print(f"\033[93m[CATALOG] Lazy-creating new dish: {payload.dish_name}\033[0m")
        dish = models.Dish(
            name=payload.dish_name,
            venue_id=venue_id,
            cuisine=payload.cuisine.strip().title() if payload.cuisine else None,
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


@app.put("/reviews/{review_id}")
def update_review(review_id: str, payload: ReviewUpdatePayload, db: Session = Depends(get_db)):
    """Updates an existing food review and its details."""
    try:
        val = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review ID format")

    review = db.query(models.Review).options(
        joinedload(models.Review.dish),
        joinedload(models.Review.venue),
        joinedload(models.Review.media)
    ).filter(models.Review.id == val).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # 1. Update Venue if specified
    if payload.venue_name is not None:
        clean_venue = payload.venue_name.strip()
        if clean_venue:
            venue = db.query(models.Venue).filter(models.Venue.name == clean_venue).first()
            if not venue:
                venue = models.Venue(name=clean_venue, vicinity=payload.city)
                db.add(venue)
                db.commit()
                db.refresh(venue)
            elif payload.city and venue.vicinity != payload.city:
                venue.vicinity = payload.city
                db.commit()
            review.venue_id = venue.id
        else:
            review.venue_id = None

    # 2. Update Dish if specified
    if payload.dish_name is not None:
        clean_dish = payload.dish_name.strip()
        if clean_dish:
            dish = db.query(models.Dish).filter(
                models.Dish.name == clean_dish,
                models.Dish.venue_id == review.venue_id
            ).first()
            if not dish:
                dish = models.Dish(name=clean_dish, venue_id=review.venue_id)
                db.add(dish)
                db.commit()
                db.refresh(dish)
            review.dish_id = dish.id

    # 3. Update rating / notes
    if payload.rating is not None:
        review.rating = payload.rating
    if payload.sensory_notes is not None:
        review.comment = payload.sensory_notes

    # 4. Update Media
    if payload.image_url is not None:
        if review.media:
            review.media[0].media_url = payload.image_url
        elif payload.image_url:
            media = models.Media(review_id=review.id, media_url=payload.image_url)
            db.add(media)

    db.commit()
    db.refresh(review)
    return {"success": True, "review_id": str(review.id)}


@app.delete("/reviews/{review_id}")
def delete_review(review_id: str, db: Session = Depends(get_db)):
    """Permanently deletes a food review entry and its associated media."""
    try:
        val = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review ID format")

    review = db.query(models.Review).filter(models.Review.id == val).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()
    return {"success": True, "message": "Review deleted successfully"}

# Drafts
@app.post("/drafts")
def create_draft(payload: DraftPayload, db: Session = Depends(get_db)):
    """Creates a new draft entry for a user."""
    print(f"\033[96m[CATALOG] Creating draft for user: {payload.user_id}\033[0m")

    draft = models.Draft(
        user_id=payload.user_id,
        dish_name=payload.dish_name,
        venue_name=payload.venue_name,
        city=payload.city,
        cuisine=payload.cuisine,
        is_restaurant=payload.is_restaurant,
        sensory_notes=payload.sensory_notes,
        rating=payload.rating,
        image_url=payload.image_url
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return {"success": True, "draft_id": str(draft.id)}
    

@app.get("/drafts/{user_id}")
def get_user_drafts(user_id: str, db: Session = Depends(get_db)):
    """Fetches all draft entries for a user, sorted newest first."""
    print(f"\033[96m[CATALOG] Fetching drafts for user: {user_id}\033[0m")

    drafts = db.query(models.Draft)\
        .filter(models.Draft.user_id == user_id)\
        .order_by(models.Draft.created_at.desc())\
        .all()

    result = []
    for d in drafts:
        result.append({
            "id": str(d.id),
            "dish_name": d.dish_name,
            "venue_name": d.venue_name,
            "city": d.city,
            "cuisine": d.cuisine,
            "is_restaurant": d.is_restaurant,
            "sensory_notes": d.sensory_notes,
            "rating": d.rating,
            "image_url": d.image_url,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat()
        })

    print(f"\033[92m[CATALOG] Successfully retrieved {len(result)} entries for user drafts.\033[0m")
    return {"drafts": result, "count": len(result)}

@app.put("/drafts/{draft_id}")
def update_draft(draft_id: str, payload: DraftUpdatePayload, db: Session = Depends(get_db)):
    """Updates an existing draft entry."""
    try:
        val = uuid.UUID(draft_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid draft ID format")

    draft = db.query(models.Draft).filter(models.Draft.id == val).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Update fields if provided
    if payload.dish_name is not None:
        draft.dish_name = payload.dish_name
    if payload.venue_name is not None:
        draft.venue_name = payload.venue_name
    if payload.city is not None:
        draft.city = payload.city
    if payload.cuisine is not None:
        draft.cuisine = payload.cuisine
    if payload.is_restaurant is not None:
        draft.is_restaurant = payload.is_restaurant
    if payload.sensory_notes is not None:
        draft.sensory_notes = payload.sensory_notes
    if payload.rating is not None:
        draft.rating = payload.rating
    if payload.image_url is not None:
        draft.image_url = payload.image_url

    db.commit()
    db.refresh(draft)
    return {"success": True, "draft_id": str(draft.id)}


@app.delete("/drafts/{draft_id}")
def delete_draft(draft_id: str, db: Session = Depends(get_db)):
    """Permanently deletes a draft entry."""
    try:
        val = uuid.UUID(draft_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Draft ID format")

    draft = db.query(models.Draft).filter(models.Draft.id == val).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    db.delete(draft)
    db.commit()
    return {"success": True, "message": "Draft deleted successfully"}

@app.post("/drafts/{draft_id}/publish")
async def publish_draft(draft_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Converts a draft into a real review, then deletes the draft."""
    try:
        val = uuid.UUID(draft_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid draft ID format")

    draft = db.query(models.Draft).filter(models.Draft.id == val).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if not draft.dish_name or draft.rating is None:
        raise HTTPException(status_code=400, detail="Dish name and rating are required to publish")

    print(f"\033[96m[CATALOG] Publishing draft {draft_id} for user {draft.user_id}\033[0m")

    # 1. Handle Venue
    venue_id = None
    if draft.venue_name:
        venue = db.query(models.Venue).filter(models.Venue.name == draft.venue_name).first()
        if not venue:
            venue = models.Venue(name=draft.venue_name, vicinity=draft.city)
            db.add(venue)
            db.commit()
            db.refresh(venue)
        venue_id = venue.id

    # 2. Handle Dish
    dish = db.query(models.Dish).filter(
        models.Dish.name == draft.dish_name,
        models.Dish.venue_id == venue_id,
    ).first()

    if not dish:
        dish = models.Dish(
            name=draft.dish_name,
            venue_id=venue_id,
            cuisine=draft.cuisine.strip().title() if draft.cuisine else None,
        )
        db.add(dish)
        db.commit()
        db.refresh(dish)

    # 3. Create the Review
    review = models.Review(
        user_id=draft.user_id,
        dish_id=dish.id,
        venue_id=venue_id,
        rating=draft.rating,
        comment=draft.sensory_notes
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # 4. Create Media reference if attached
    if draft.image_url:
        media = models.Media(review_id=review.id, media_url=draft.image_url)
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
    background_tasks.add_task(notify_user_service, draft.user_id, dish_data, draft.rating)

    # 6. Delete the draft now that it's published
    db.delete(draft)
    db.commit()

    return {"success": True, "review_id": str(review.id)}

# ── User Telemetry / Interactions (Feed Recommendation Signals) ────────────────

def _parse_optional_uuid(val: Optional[str]) -> Optional[uuid.UUID]:
    if not val:
        return None
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None

@app.post("/interactions")
def log_interaction(item: InteractionItem, db: Session = Depends(get_db)):
    """Logs a single user interaction event (telemetry for recommendation engine)."""
    interaction = models.UserInteraction(
        user_id=item.user_id,
        dish_id=_parse_optional_uuid(item.dish_id),
        venue_id=_parse_optional_uuid(item.venue_id),
        interaction_type=item.interaction_type,
        dwell_time_ms=item.dwell_time_ms,
        session_id=item.session_id,
        context=item.context,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return {"status": "ok", "id": str(interaction.id)}

@app.post("/interactions/batch")
def log_interactions_batch(payload: BatchInteractionPayload, db: Session = Depends(get_db)):
    """Logs a batch of user interactions in a single efficient transaction."""
    records = []
    for item in payload.interactions:
        records.append(
            models.UserInteraction(
                user_id=item.user_id,
                dish_id=_parse_optional_uuid(item.dish_id),
                venue_id=_parse_optional_uuid(item.venue_id),
                interaction_type=item.interaction_type,
                dwell_time_ms=item.dwell_time_ms,
                session_id=item.session_id,
                context=item.context,
            )
        )
    if records:
        db.add_all(records)
        db.commit()
    return {"status": "ok", "count": len(records)}

@app.get("/interactions/{user_id}")
def get_user_interactions(user_id: str, limit: int = 100, db: Session = Depends(get_db)):
    """Fetches recent interactions for a given user."""
    items = (
        db.query(models.UserInteraction)
        .filter(models.UserInteraction.user_id == user_id)
        .order_by(models.UserInteraction.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "interactions": [
            {
                "id": str(i.id),
                "user_id": i.user_id,
                "dish_id": str(i.dish_id) if i.dish_id else None,
                "venue_id": str(i.venue_id) if i.venue_id else None,
                "interaction_type": i.interaction_type,
                "dwell_time_ms": i.dwell_time_ms,
                "session_id": i.session_id,
                "context": i.context,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in items
        ],
        "count": len(items),
    }

# ── Dynamic Recommendation Feed (Instagram-Style Algorithmic Ranking) ─────────

async def fetch_user_palate(user_id: Optional[str]) -> List[float]:
    default_palate = [0.5, 0.5, 0.5, 0.5, 0.5]
    if not user_id:
        return default_palate
    user_svc_url = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{user_svc_url}/flavor-profiles/{user_id}")
            if resp.status_code == 200:
                data = resp.json()
                return [
                    float(data.get("spice", 0.5)),
                    float(data.get("acid", 0.5)),
                    float(data.get("umami", 0.5)),
                    float(data.get("sweet", 0.5)),
                    float(data.get("texture", 0.5)),
                ]
    except Exception as e:
        print(f"\033[93m[CATALOG] Could not fetch remote palate profile: {e}\033[0m")
    return default_palate

@app.get("/feed")
async def get_personalized_feed(
    user_id: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Returns an algorithmic, personalized feed of dishes.
    Ranks candidates by combining 5D palate cosine similarity, venue distance,
    dish ratings, and implicit telemetry feedback (dwells, saves, and skips).
    """
    # 1. User Palate Vector
    user_palate = await fetch_user_palate(user_id)

    # 2. Telemetry Interaction Summary
    user_interactions_summary: Dict[str, Dict[str, Any]] = {}
    if user_id:
        try:
            interactions = (
                db.query(models.UserInteraction)
                .filter(models.UserInteraction.user_id == user_id)
                .all()
            )
            for act in interactions:
                d_id = str(act.dish_id) if act.dish_id else None
                if not d_id:
                    continue
                if d_id not in user_interactions_summary:
                    user_interactions_summary[d_id] = {
                        "skip_count": 0,
                        "saved": False,
                        "total_dwell_ms": 0,
                    }
                if act.interaction_type == "skip":
                    user_interactions_summary[d_id]["skip_count"] += 1
                elif act.interaction_type == "save":
                    user_interactions_summary[d_id]["saved"] = True
                elif act.interaction_type == "dwell":
                    user_interactions_summary[d_id]["total_dwell_ms"] += (act.dwell_time_ms or 0)
        except Exception as e:
            print(f"\033[93m[CATALOG] Error reading user interactions: {e}\033[0m")

    # 3. Candidate Retrieval
    dishes = (
        db.query(models.Dish)
        .options(
            joinedload(models.Dish.venue),
            joinedload(models.Dish.reviews).joinedload(models.Review.media)
        )
        .all()
    )

    candidates = []
    for d in dishes:
        reviews = d.reviews or []
        ratings = [r.rating for r in reviews if r.rating is not None]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

        notes = d.description or ""
        media_url = None
        for r in reviews:
            if r.comment and not notes:
                notes = r.comment
            if r.media and not media_url:
                media_url = r.media[0].media_url

        tags = []
        if d.cuisine:
            tags.append(d.cuisine)
        if avg_rating >= 4.5:
            tags.append("Top Rated")
        if d.base_spice >= 0.7:
            tags.append("Spicy")
        if d.base_umami >= 0.7:
            tags.append("Umami Rich")

        candidates.append({
            "id": str(d.id),
            "title": d.name,
            "restaurant": d.venue.name if d.venue else "Local Venue",
            "location": d.venue.vicinity if d.venue else "Local Area",
            "lat": d.venue.lat if d.venue else None,
            "lng": d.venue.lng if d.venue else None,
            "cuisine": d.cuisine or "Specialty",
            "rating": avg_rating,
            "review_count": len(reviews),
            "tastingNotes": notes or "Curated dish based on your flavor profile.",
            "image": media_url,
            "date": d.created_at.strftime("%b %d, %Y") if d.created_at else "Recent",
            "tags": tags,
            "base_spice": d.base_spice or 0.5,
            "base_acid": d.base_acid or 0.5,
            "base_umami": d.base_umami or 0.5,
            "base_sweet": d.base_sweet or 0.5,
            "base_texture": d.base_texture or 0.5,
        })

    # 4. Multi-Signal Ranking & Diversity Pass
    ranked = rank_and_diversify_feed(
        candidates=candidates,
        user_palate=user_palate,
        user_interactions=user_interactions_summary,
        user_lat=lat,
        user_lng=lng
    )

    # 5. Pagination
    safe_page = max(1, page)
    safe_limit = max(1, min(50, limit))
    start = (safe_page - 1) * safe_limit
    end = start + safe_limit
    paged = ranked[start:end]

    return {
        "feed": paged,
        "page": safe_page,
        "limit": safe_limit,
        "total": len(ranked),
        "has_more": end < len(ranked),
    }


