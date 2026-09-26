import os
import requests
from typing import List, Optional, Tuple

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
HEADERS = {"User-Agent": "JustAteIt-App/1.0 (dev@justateit.app)"}

def _fetch_from_osm(lat: str, lon: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Free OpenStreetMap fallback using Nominatim reverse geocode & Overpass nearby search."""
    try:
        print(f"\033[96m[OPENSTREETMAP] Querying free venue discovery for ({lat}, {lon})...\033[0m")
        
        # 1. Reverse geocode via Nominatim for city and possible POI name
        city = None
        poi_name = None
        nom_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
        nom_resp = requests.get(nom_url, headers=HEADERS, timeout=4)
        if nom_resp.status_code == 200:
            nom_data = nom_resp.json()
            addr = nom_data.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("suburb") or addr.get("county") or "Local Area"
            
            # If the resolved place itself is a food amenity/shop, use its name
            osm_type = nom_data.get("type", "")
            osm_name = nom_data.get("name", "")
            if osm_name and osm_type in ["restaurant", "cafe", "fast_food", "bar", "pub", "food", "ice_cream", "bakery", "bistro"]:
                poi_name = osm_name
                road = addr.get("road", "")
                vicinity = f"{road}, {city}" if road else city
                place_id = f"osm_{nom_data.get('osm_type', 'node')}_{nom_data.get('osm_id', '0')}"
                print(f"\033[92m[OPENSTREETMAP] Found direct POI: '{poi_name}' in '{vicinity}'\033[0m")
                return poi_name, vicinity, place_id

        # 2. Query Overpass API for the closest restaurant/cafe within 250m
        query = f"""
        [out:json][timeout:4];
        (
          node(around:250,{lat},{lon})["amenity"~"restaurant|cafe|fast_food|bar|pub|ice_cream|bistro"];
          way(around:250,{lat},{lon})["amenity"~"restaurant|cafe|fast_food|bar|pub|ice_cream|bistro"];
        );
        out center;
        """
        op_resp = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers=HEADERS, timeout=4)
        if op_resp.status_code == 200:
            op_data = op_resp.json()
            elements = op_data.get("elements", [])
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name")
                if name:
                    street = tags.get("addr:street")
                    vicinity = f"{street}, {city}" if street and city else (street or city or "Local Area")
                    place_id = f"osm_{el.get('type', 'node')}_{el.get('id', '0')}"
                    print(f"\033[92m[OPENSTREETMAP] Found nearby venue: '{name}' in '{vicinity}' (id: {place_id})\033[0m")
                    return name, vicinity, place_id

        # 3. If no specific restaurant was found, fallback to location city
        if city:
            print(f"\033[93m[OPENSTREETMAP] No specific restaurant tagged within 250m. Found city: '{city}'\033[0m")
            return None, city, None

    except Exception as e:
        print(f"\033[91m[OPENSTREETMAP] Lookup error: {e}\033[0m")
    
    return None, None, None


def _search_osm_by_cuisine(city: str, cuisine: str, limit: int) -> List[dict]:
    """Free Overpass search for restaurants of a given cuisine inside a named city."""
    # OSM cuisine tags are lowercase single words ("indian", "chinese", "thai").
    tag = cuisine.strip().lower().split()[0] if cuisine.strip() else ""
    if not tag:
        return []
    query = f"""
    [out:json][timeout:10];
    area["name"="{city}"]["boundary"="administrative"]->.searchArea;
    (
      node(area.searchArea)["amenity"="restaurant"]["cuisine"~"{tag}",i];
      way(area.searchArea)["amenity"="restaurant"]["cuisine"~"{tag}",i];
    );
    out center {limit};
    """
    try:
        resp = requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query}, headers=HEADERS, timeout=10,
        )
        if resp.status_code != 200:
            print(f"\033[93m[OPENSTREETMAP] Cuisine search HTTP {resp.status_code} for '{cuisine}' in '{city}'\033[0m")
            return []
        found = []
        for el in resp.json().get("elements", []):
            tags = el.get("tags", {})
            name = tags.get("name")
            if not name:
                continue
            street = tags.get("addr:street")
            found.append({
                "name": name,
                "address": f"{street}, {city}" if street else city,
                "place_id": f"osm_{el.get('type', 'node')}_{el.get('id', '0')}",
            })
        print(f"\033[92m[OPENSTREETMAP] Found {len(found)} '{cuisine}' restaurant(s) in '{city}'\033[0m")
        return found[:limit]
    except Exception as e:
        print(f"\033[91m[OPENSTREETMAP] Cuisine search error: {e}\033[0m")
        return []


def find_restaurants_by_cuisine(city: str, cuisine: str, limit: int = 8) -> List[dict]:
    """
    Returns real restaurants of `cuisine` in `city` as [{name, address, place_id}].

    Unlike get_nearby_restaurant (which is coordinate-based and used while logging),
    this searches by city name so recommendations can cite venues that actually
    exist. Returns [] rather than guessing — callers must omit the venue instead
    of inventing one.
    """
    if not city or not cuisine:
        return []

    if GOOGLE_API_KEY:
        try:
            url = (
                f"https://maps.googleapis.com/maps/api/place/textsearch/json"
                f"?query={requests.utils.quote(f'{cuisine} restaurant in {city}')}&key={GOOGLE_API_KEY}"
            )
            data = requests.get(url, timeout=6).json()
            status = data.get("status")
            if status == "OK" and data.get("results"):
                found = [
                    {
                        "name": r.get("name"),
                        "address": r.get("formatted_address", city),
                        "place_id": r.get("place_id"),
                    }
                    for r in data["results"][:limit] if r.get("name")
                ]
                print(f"\033[92m[GOOGLE PLACES] Found {len(found)} '{cuisine}' restaurant(s) in '{city}'\033[0m")
                return found
            print(f"\033[93m[GOOGLE PLACES] Status '{status}' ({data.get('error_message')}) -> OpenStreetMap...\033[0m")
        except Exception as e:
            print(f"\033[91m[GOOGLE PLACES] Cuisine search error: {e} -> OpenStreetMap...\033[0m")

    return _search_osm_by_cuisine(city, cuisine, limit)


def get_nearby_restaurant(lat: str, lon: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Finds the closest restaurant via Google Places or free OpenStreetMap fallback."""
    # 1. Try Google Places if key is configured
    if GOOGLE_API_KEY:
        try:
            url = (
                f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                f"?location={lat},{lon}&radius=200&type=restaurant&key={GOOGLE_API_KEY}"
            )
            resp = requests.get(url, timeout=4)
            data = resp.json()
            status = data.get("status")
            
            if status == "OK" and data.get("results"):
                best_match = data["results"][0]
                name = best_match.get("name")
                vicinity = best_match.get("vicinity", "")
                place_id = best_match.get("place_id")
                print(f"\033[92m[GOOGLE PLACES] Found: '{name}' at '{vicinity}' (place_id: {place_id})\033[0m")
                return name, vicinity, place_id
            else:
                print(f"\033[93m[GOOGLE PLACES] Status: '{status}' ({data.get('error_message')}) -> Falling back to OpenStreetMap...\033[0m")
        except Exception as e:
            print(f"\033[91m[GOOGLE PLACES] Error: {e} -> Falling back to OpenStreetMap...\033[0m")

    # 2. Seamless Free OpenStreetMap fallback
    return _fetch_from_osm(lat, lon)
