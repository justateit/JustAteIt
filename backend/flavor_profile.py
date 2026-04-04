"""
flavor_profile.py — JustAteIt Flavor Profile API
Runs on port 8001 (separate from the S3 image-upload server on port 8000).

Formula:
    P_new = P_old + α [ |signal|(0.5 - P_old) + signal(F_dish - 0.5) ]
    where signal = (R - 3) / 2   maps ratings  1→-1, 3→0, 5→+1
          α      = adaptive learning rate that shrinks as the user reviews more dishes
    This is a nonlinear update equation that is used to update the user's flavor profile based on their ratings.
"""

from typing import Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Mock Data
# ─────────────────────────────────────────────────────────────────────────────

FLAVOR_DIMS = ["spice", "acid", "umami", "sweet", "texture"]

# Mock in-memory user profiles  →  swap for a DB query when Supabase is wired up
# Each entry: { dim: float[0,1], ..., "review_count": int }
MOCK_PROFILES: Dict[str, dict] = {
    "default": {
        "spice":        0.35,
        "acid":         0.50,
        "umami":        0.70,
        "sweet":        0.30,
        "texture":      0.45,
        "review_count": 12,
    }
}

# Mock dish flavor fingerprints  →  swap for a dishes table lookup
# Each dish maps every dimension to a score in [0, 1]
MOCK_DISHES: Dict[str, dict] = {
    "dish_001": {"spice": 0.90, "acid": 0.30, "umami": 0.60, "sweet": 0.10, "texture": 0.70},  # very spicy
    "dish_002": {"spice": 0.10, "acid": 0.20, "umami": 0.40, "sweet": 0.90, "texture": 0.30},  # very sweet
    "dish_003": {"spice": 0.50, "acid": 0.80, "umami": 0.50, "sweet": 0.20, "texture": 0.60},  # acidic / bright
    "dish_004": {"spice": 0.30, "acid": 0.40, "umami": 0.90, "sweet": 0.30, "texture": 0.80},  # deep umami
}

# ─────────────────────────────────────────────────────────────────────────────
# Flavor Profile Engine
# ─────────────────────────────────────────────────────────────────────────────

def update_dimension(P_old: float, R: float, F_dish: float, alpha: float) -> float:
    """
    Apply the update formula to a single flavor dimension.

    Args:
        P_old   Current user preference for this dimension  [0, 1]
        R       Star rating the user gave                   [1, 5]
        F_dish  Dish's score for this dimension             [0, 1]
        alpha   Learning rate

    Returns:
        P_new clamped to [0, 1]
    """
    signal          = (R - 3) / 2                        # -1 … +1
    regression_term = abs(signal) * (0.5 - P_old)        # pulls toward neutral on extreme ratings
    learning_term   = signal * (F_dish - 0.5)            # pushes toward dish flavor if liked
    P_new           = P_old + alpha * (regression_term + learning_term)
    return max(0.0, min(1.0, P_new))


def adaptive_alpha(review_count: int) -> float:
    """Learning rate starts at ~0.3 and halves every ~10 reviews, floors at 0.02."""
    return max(0.02, 0.3 / (review_count + 1))


def personality_label(profile: dict) -> str:
    """Derive a human-readable flavour personality from the dominant dimension."""
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
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="JustAteIt — Flavor Profile API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class RatingPayload(BaseModel):
    user_id: str
    dish_id: str
    rating:  float   # 1–5 stars


class ProfileResponse(BaseModel):
    user_id:      str
    profile:      Dict[str, float]
    review_count: int
    personality:  str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/flavor-profile/{user_id}", response_model=ProfileResponse)
def get_flavor_profile(user_id: str):
    """
    Return the current flavor profile for a user.
    Falls back to the default mock profile if the user hasn't reviewed anything yet.
    """
    profile = MOCK_PROFILES.get(user_id, MOCK_PROFILES["default"])
    return {
        "user_id":      user_id,
        "profile":      {d: round(profile[d], 4) for d in FLAVOR_DIMS},
        "review_count": profile.get("review_count", 0),
        "personality":  personality_label(profile),
    }


@app.post("/flavor-profile/update", response_model=ProfileResponse)
def update_flavor_profile(payload: RatingPayload):
    """
    Submit a rating for a dish and recalculate the user's flavor profile.

    The formula applied per dimension:
        P_new = P_old + α[ |signal|(0.5 - P_old) + signal(F_dish - 0.5) ]
    where signal = (R - 3) / 2
    """
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    dish = MOCK_DISHES.get(payload.dish_id)
    if not dish:
        raise HTTPException(
            status_code=404,
            detail=f"Dish '{payload.dish_id}' not found. Available: {list(MOCK_DISHES.keys())}"
        )

    # Load or initialise profile
    profile      = dict(MOCK_PROFILES.get(payload.user_id, MOCK_PROFILES["default"]))
    review_count = int(profile.get("review_count", 0))
    alpha        = adaptive_alpha(review_count)

    # Update every flavor dimension
    for dim in FLAVOR_DIMS:
        P_old          = profile.get(dim, 0.5)
        F_dish         = dish.get(dim, 0.5)
        profile[dim]   = update_dimension(P_old, payload.rating, F_dish, alpha)

    profile["review_count"] = review_count + 1
    MOCK_PROFILES[payload.user_id] = profile

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


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
