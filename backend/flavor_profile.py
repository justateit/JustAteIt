"""
flavor_profile.py — JustAteIt Flavor Profile + Logs + Users API
Runs on port 8001 (separate from the S3 image-upload server on port 8000).

Formula:
    P_new = P_old + α [ |signal|(0.5 - P_old) + signal(F_dish - 0.5) ]
    where signal = (R - 3) / 2   maps ratings  1→-1, 3→0, 5→+1
          α      = adaptive learning rate that shrinks as the user reviews more dishes
"""

from typing import Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from db import get_db

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Dish Catalog
# ─────────────────────────────────────────────────────────────────────────────

FLAVOR_DIMS = ["spice", "acid", "umami", "sweet", "texture"]

DEFAULT_PROFILE = {
    "spice":        0.35,
    "acid":         0.50,
    "umami":        0.70,
    "sweet":        0.30,
    "texture":      0.45,
    "review_count": 0,
}

# Dish flavor fingerprints — swap for a dishes table later
MOCK_DISHES: Dict[str, dict] = {
    "dish_001": {"spice": 0.90, "acid": 0.30, "umami": 0.60, "sweet": 0.10, "texture": 0.70},
    "dish_002": {"spice": 0.10, "acid": 0.20, "umami": 0.40, "sweet": 0.90, "texture": 0.30},
    "dish_003": {"spice": 0.50, "acid": 0.80, "umami": 0.50, "sweet": 0.20, "texture": 0.60},
    "dish_004": {"spice": 0.30, "acid": 0.40, "umami": 0.90, "sweet": 0.30, "texture": 0.80},
}

# ─────────────────────────────────────────────────────────────────────────────
# Flavor Profile Engine
# ─────────────────────────────────────────────────────────────────────────────

def update_dimension(P_old: float, R: float, F_dish: float, alpha: float) -> float:
    signal          = (R - 3) / 2
    regression_term = abs(signal) * (0.5 - P_old)
    learning_term   = signal * (F_dish - 0.5)
    P_new           = P_old + alpha * (regression_term + learning_term)
    return max(0.0, min(1.0, P_new))


def adaptive_alpha(review_count: int) -> float:
    return max(0.02, 0.3 / (review_count + 1))


def personality_label(profile: dict) -> str:
    scores   = {d: profile[d] for d in FLAVOR_DIMS}
    dominant = max(scores, key=scores.get)
    return {
        "spice":   "Spice Chaser",
        "acid":    "Acid Lover",
        "umami":   "Umami Seeker",
        "sweet":   "Sweet Tooth",
        "texture": "Texture Obsessive",
    }.get(dominant, "Culinary Explorer")


# ─────────────────────────────────────────────────────────────────────────────
# Supabase Helpers
# ─────────────────────────────────────────────────────────────────────────────

def ensure_user(user_id: str):
    """Upsert a bare user row so FK constraints are never violated."""
    db = get_db()
    db.table("users").upsert({"id": user_id}).execute()


def _get_profile_row(user_id: str) -> dict:
    """Fetch the flavor_profiles row, or return defaults if missing."""
    db = get_db()
    res = db.table("flavor_profiles").select("*").eq("user_id", user_id).execute()
    if res.data:
        return dict(res.data[0])
    return {**DEFAULT_PROFILE, "user_id": user_id}


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="JustAteIt — Data API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class RatingPayload(BaseModel):
    user_id: str
    dish_id: str
    rating:  float   # 1–5 stars


class ProfileResponse(BaseModel):
    user_id:      str
    profile:      Dict[str, float]
    review_count: int
    personality:  str


class LogPayload(BaseModel):
    user_id:       str
    dish:          str
    venue:         Optional[str] = None
    city:          Optional[str] = None
    is_restaurant: bool = True
    sensory_notes: Optional[str] = None
    rating:        Optional[float] = None
    image_url:     Optional[str] = None


class UserPayload(BaseModel):
    id:         str   # Clerk user_id
    username:   Optional[str] = None
    bio:        Optional[str] = None
    avatar_url: Optional[str] = None


# ── Flavor Profile Endpoints ──────────────────────────────────────────────────

@app.get("/flavor-profile/{user_id}", response_model=ProfileResponse)
def get_flavor_profile(user_id: str):
    """Return the current flavor profile for a user from Supabase."""
    ensure_user(user_id)
    profile = _get_profile_row(user_id)

    # If the row didn't exist, insert defaults now
    db = get_db()
    res = db.table("flavor_profiles").select("user_id").eq("user_id", user_id).execute()
    if not res.data:
        db.table("flavor_profiles").insert({
            "user_id": user_id,
            **{d: DEFAULT_PROFILE[d] for d in FLAVOR_DIMS},
            "review_count": 0,
        }).execute()

    return {
        "user_id":      user_id,
        "profile":      {d: round(profile[d], 4) for d in FLAVOR_DIMS},
        "review_count": profile.get("review_count", 0),
        "personality":  personality_label(profile),
    }


@app.post("/flavor-profile/update", response_model=ProfileResponse)
def update_flavor_profile(payload: RatingPayload):
    """Submit a dish rating and recalculate the user's flavor profile."""
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    dish = MOCK_DISHES.get(payload.dish_id)
    if not dish:
        raise HTTPException(
            status_code=404,
            detail=f"Dish '{payload.dish_id}' not found. Available: {list(MOCK_DISHES.keys())}"
        )

    db = get_db()
    ensure_user(payload.user_id)
    profile      = _get_profile_row(payload.user_id)
    review_count = int(profile.get("review_count", 0))
    alpha        = adaptive_alpha(review_count)

    for dim in FLAVOR_DIMS:
        profile[dim] = update_dimension(
            profile.get(dim, 0.5), payload.rating, dish.get(dim, 0.5), alpha
        )
    profile["review_count"] = review_count + 1

    db.table("flavor_profiles").upsert({
        "user_id":      payload.user_id,
        **{d: profile[d] for d in FLAVOR_DIMS},
        "review_count": profile["review_count"],
    }).execute()

    print(f"[FlavorProfile] {payload.user_id} rated {payload.dish_id} "
          f"★{payload.rating} | α={alpha:.3f} | personality={personality_label(profile)}")

    return {
        "user_id":      payload.user_id,
        "profile":      {d: round(profile[d], 4) for d in FLAVOR_DIMS},
        "review_count": profile["review_count"],
        "personality":  personality_label(profile),
    }


@app.get("/flavor-profile/dishes/mock")
def get_mock_dishes():
    """Dev helper — list all mock dish IDs and their flavor fingerprints."""
    return MOCK_DISHES


# ── Log / Journal Endpoints ───────────────────────────────────────────────────

@app.post("/logs")
def create_log(payload: LogPayload):
    """Save a new food journal entry to Supabase."""
    db = get_db()
    ensure_user(payload.user_id)

    log_data = payload.model_dump()
    res = db.table("logs").insert(log_data).execute()

    print(f"[Logs] Saved entry for {payload.user_id}: {payload.dish} @ {payload.venue}")
    return {"success": True, "log": res.data[0] if res.data else None}


@app.get("/logs/{user_id}")
def get_logs(user_id: str):
    """Fetch all journal entries for a user, newest first."""
    db = get_db()
    res = (
        db.table("logs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"logs": res.data, "count": len(res.data)}


# ── User Profile Endpoints ────────────────────────────────────────────────────

@app.post("/users")
def upsert_user(payload: UserPayload):
    """Create or update a user profile row (call this on first sign-in)."""
    db = get_db()
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    db.table("users").upsert(data).execute()
    return {"success": True}


@app.get("/users/{user_id}")
def get_user(user_id: str):
    """Fetch a user's profile data."""
    db = get_db()
    res = db.table("users").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
