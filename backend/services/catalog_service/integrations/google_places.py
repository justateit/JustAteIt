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


def _search_osm(cities: List[str], cuisines: List[str], limit: int) -> List[dict]:
    """
    One Overpass request covering every city/cuisine pair.

    Deliberately a single query: the public Overpass instance allows only two
    concurrent slots and often answers "server too busy", so issuing one query
    per city/cuisine made total failure the common case rather than the
    exception. Multiple areas and a cuisine alternation cost one request.
    """
    # OSM cuisine tags are lowercase, and often compound ("indian;curry",
    # "bakery;chinese"), so an unanchored alternation matches the widest set.
    tags = [c.strip().lower().split()[0] for c in cuisines if c.strip()]
    safe_cities = [c for c in cities if c and '"' not in c]
    if not tags or not safe_cities:
        return []

    areas = "\n      ".join(
        f'area["name"="{c}"]["boundary"="administrative"];' for c in safe_cities
    )
    pattern = "|".join(tags)
    # Short timeouts on purpose: callers already hold a usable venue list, so a
    # slow Overpass is worse than no Overpass. Give up quickly rather than making
    # the user wait on a public instance that may never answer.
    query = f"""
    [out:json][timeout:12];
    (
      {areas}
    )->.a;
    (
      node(area.a)["amenity"="restaurant"]["cuisine"~"{pattern}",i];
      way(area.a)["amenity"="restaurant"]["cuisine"~"{pattern}",i];
    );
    out center {limit};
    """
    try:
        resp = requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query}, headers=HEADERS, timeout=15,
        )
        if resp.status_code != 200:
            print(f"\033[93m[OPENSTREETMAP] Venue search HTTP {resp.status_code}\033[0m")
            return []
        payload = resp.json()
    except Exception as e:
        # Overload returns an HTML error page, so a JSON decode failure here is
        # the normal "server busy" path, not a bug.
        print(f"\033[91m[OPENSTREETMAP] Venue search unavailable: {e}\033[0m")
        return []

    # Keep only venues whose own address names one of the requested cities —
    # an untagged venue can't be attributed, and guessing its city would pair
    # a dish with a restaurant in the wrong place.
    by_city = {c.lower(): c for c in safe_cities}
    found = []
    for el in payload.get("elements", []):
        t = el.get("tags", {})
        name, addr_city = t.get("name"), (t.get("addr:city") or "").strip()
        if not name or addr_city.lower() not in by_city:
            continue
        raw_cuisine = (t.get("cuisine") or "").lower()
        matched = next((tag for tag in tags if tag in raw_cuisine), None)
        if not matched:
            continue
        street = t.get("addr:street")
        found.append({
            "name": name,
            "city": by_city[addr_city.lower()],
            "cuisine": matched,
            "address": f"{street}, {addr_city}" if street else addr_city,
            "place_id": f"osm_{el.get('type', 'node')}_{el.get('id', '0')}",
        })
    print(f"\033[92m[OPENSTREETMAP] Found {len(found)} venue(s) across {safe_cities} for {tags}\033[0m")
    return found


def find_restaurants(cities: List[str], cuisines: List[str], limit: int = 60) -> List[dict]:
    """
    Real restaurants matching any of `cuisines` in any of `cities`,
    as [{name, city, cuisine, address, place_id}].

    Unlike get_nearby_restaurant (coordinate-based, used while logging), this
    searches by city so recommendations can cite venues that actually exist.
    Returns [] rather than guessing — callers must omit the venue instead of
    inventing one.
    """
    if not cities or not cuisines:
        return []

    if GOOGLE_API_KEY:
        found, seen = [], set()
        # Google is a paid, reliable service with no 2-slot ceiling, so pairwise
        # text searches are fine here; it also isn't limited to volunteer
        # cuisine tags, which is where OSM thins out in suburbs.
        for city in cities[:3]:
            for cuisine in cuisines[:2]:
                try:
                    url = (
                        f"https://maps.googleapis.com/maps/api/place/textsearch/json"
                        f"?query={requests.utils.quote(f'{cuisine} restaurant in {city}')}"
                        f"&key={GOOGLE_API_KEY}"
                    )
                    data = requests.get(url, timeout=6).json()
                    if data.get("status") != "OK":
                        print(f"\033[93m[GOOGLE PLACES] Status '{data.get('status')}' ({data.get('error_message')})\033[0m")
                        continue
                    for r in data.get("results", [])[:6]:
                        name = r.get("name")
                        if not name or (name, city) in seen:
                            continue
                        seen.add((name, city))
                        found.append({
                            "name": name,
                            "city": city,
                            "cuisine": cuisine,
                            "address": r.get("formatted_address", city),
                            "place_id": r.get("place_id"),
                        })
                except Exception as e:
                    print(f"\033[91m[GOOGLE PLACES] Search error for {cuisine}/{city}: {e}\033[0m")
        if found:
            print(f"\033[92m[GOOGLE PLACES] Found {len(found)} venue(s)\033[0m")
            return found[:limit]
        print("\033[93m[GOOGLE PLACES] No results -> OpenStreetMap...\033[0m")

    return _search_osm(cities, cuisines, limit)


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
