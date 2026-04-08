FLAVOR_DIMS = ["spice", "acid", "umami", "sweet", "texture"]

def update_dimension(P_old: float, R: float, F_dish: float, alpha: float) -> float:
    signal          = (R - 3) / 2
    regression_term = abs(signal) * (0.5 - P_old)
    learning_term   = signal * (F_dish - 0.5)
    P_new           = P_old + alpha * (regression_term + learning_term)
    return max(0.0, min(1.0, P_new))

def adaptive_alpha(review_count: int) -> float:
    return max(0.02, 0.3 / (review_count + 1))

def personality_label(profile: dict) -> str:
    scores   = {d: profile.get(d, 0.5) for d in FLAVOR_DIMS}
    dominant = max(scores, key=scores.get)
    return {
        "spice":   "Spice Chaser",
        "acid":    "Acid Lover",
        "umami":   "Umami Seeker",
        "sweet":   "Sweet Tooth",
        "texture": "Texture Obsessive",
    }.get(dominant, "Culinary Explorer")
