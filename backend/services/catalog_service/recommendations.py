import math
from typing import List, Dict, Any, Optional

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two 5D flavor vectors (range 0.0 to 1.0)."""
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.5
    cos_sim = dot / (norm1 * norm2)
    return max(0.0, min(1.0, cos_sim))

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_palate_reason(user_vec: List[float], dish_vec: List[float], cuisine: Optional[str]) -> str:
    """Generates a dynamic 1-sentence insight explaining why this dish matches the user."""
    dimensions = ["spice", "acid", "umami", "sweet", "texture"]
    # Find dimension with highest product (strongest shared peak)
    peaks = sorted(
        zip(dimensions, user_vec, dish_vec),
        key=lambda x: x[1] * x[2],
        reverse=True
    )
    top_dim, u_val, d_val = peaks[0]

    dim_descriptions = {
        "spice": "heat and vibrant pepper profiles",
        "acid": "bright citrus and tangy acidity",
        "umami": "deep savory richness and broth depth",
        "sweet": "balanced sweetness and caramel notes",
        "texture": "crisp, multi-layered textures",
    }
    desc = dim_descriptions.get(top_dim, "flavor balance")

    if cuisine:
        return f"Aligns with your craving for {desc} in {cuisine} dishes."
    return f"Strong match for your preference for {desc}."

def rank_and_diversify_feed(
    candidates: List[Dict[str, Any]],
    user_palate: List[float],
    user_interactions: Dict[str, Dict[str, Any]],
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    exploration_rate: float = 0.20
) -> List[Dict[str, Any]]:
    """
    Ranks candidate dishes using the multi-signal recommendation algorithm
    and applies a diversity re-ranking pass to avoid cuisine fatigue.
    """
    scored_candidates = []

    for item in candidates:
        dish_id = item["id"]
        dish_vec = [
            item.get("base_spice", 0.5),
            item.get("base_acid", 0.5),
            item.get("base_umami", 0.5),
            item.get("base_sweet", 0.5),
            item.get("base_texture", 0.5),
        ]

        # 1. Palate Fit (Cosine similarity)
        palate_sim = cosine_similarity(user_palate, dish_vec)

        # 2. Quality & Popularity
        avg_rating = item.get("avg_rating", 0.0)
        review_count = item.get("review_count", 0)
        rating_norm = (avg_rating / 5.0) if avg_rating > 0 else 0.7
        popularity = min(1.0, math.log(1 + review_count) / math.log(10)) if review_count > 0 else 0.3

        # 3. Telemetry Signals
        user_history = user_interactions.get(dish_id, {})
        has_skipped = user_history.get("skip_count", 0) > 0
        has_saved = user_history.get("saved", False)
        dwell_ms = user_history.get("total_dwell_ms", 0)

        engagement_mod = 0.0
        if has_saved:
            engagement_mod += 0.25
        if dwell_ms > 3000:
            engagement_mod += 0.15
        if has_skipped:
            engagement_mod -= 0.35  # Fatigue down-ranking

        # 4. Distance Decay
        distance_km = None
        distance_factor = 1.0
        venue_lat = item.get("lat")
        venue_lng = item.get("lng")
        if user_lat is not None and user_lng is not None and venue_lat is not None and venue_lng is not None:
            distance_km = haversine_distance_km(user_lat, user_lng, venue_lat, venue_lng)
            # 25km half-decay
            distance_factor = math.exp(-distance_km / 25.0)

        # 5. Composite Score
        composite = (
            0.45 * palate_sim +
            0.25 * rating_norm +
            0.15 * popularity +
            0.15 * max(-0.35, min(0.40, engagement_mod))
        ) * (0.65 + 0.35 * distance_factor)

        match_pct = int(round(max(0.15, min(0.99, composite)) * 100))
        reason = generate_palate_reason(user_palate, dish_vec, item.get("cuisine"))

        scored_candidates.append({
            **item,
            "_composite_score": composite,
            "match_score": match_pct,
            "recommendation_reason": reason,
            "distance_km": round(distance_km, 1) if distance_km is not None else None,
            "is_exploratory": False,
        })

    # Sort descending by composite score
    scored_candidates.sort(key=lambda x: x["_composite_score"], reverse=True)

    # ── Diversity & Exploration Pass (Re-ranking) ─────────────────────────
    final_ranked: List[Dict[str, Any]] = []
    seen_cuisines: Dict[str, int] = {}
    deferred: List[Dict[str, Any]] = []

    for item in scored_candidates:
        c = (item.get("cuisine") or "General").lower()
        # Cap consecutive or excessive frequency of the same cuisine in top feed
        if seen_cuisines.get(c, 0) >= 2 and len(final_ranked) < 15:
            deferred.append(item)
        else:
            seen_cuisines[c] = seen_cuisines.get(c, 0) + 1
            final_ranked.append(item)

    # Append deferred items back
    final_ranked.extend(deferred)

    # Mark exploration slots (e.g., slot 4, 9, 14...)
    for idx, item in enumerate(final_ranked):
        if idx > 0 and (idx + 1) % 5 == 0 and exploration_rate > 0:
            item["is_exploratory"] = True
            c = item.get("cuisine") or "new"
            item["recommendation_reason"] = f"Curated palate expansion: Explore {c} flavors outside your routine."

    return final_ranked
