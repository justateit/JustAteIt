import os
import requests
from typing import Optional, Tuple

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def get_nearby_restaurant(lat: str, lon: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Hits Google Places API to find the closest restaurant."""
    if not GOOGLE_API_KEY:
        print(">>> ERROR: GOOGLE_API_KEY not found in .env")
        return None, None, None

    try:
        url = (
            f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            f"?location={lat},{lon}&radius=50&type=restaurant&key={GOOGLE_API_KEY}"
        )
        response = requests.get(url).json()
        
        if response.get("results"):
            best_match = response["results"][0]
            name = best_match.get("name")
            vicinity = best_match.get("vicinity", "")
            place_id = best_match.get("place_id")
            return name, vicinity, place_id
    except Exception as e:
        print(f">>> Google API Failure: {e}")
    
    return None, None, None
