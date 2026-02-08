"""
Geocoder utility for converting location names to coordinates.
Uses OpenStreetMap's Nominatim API (free, no API key required).
"""

import httpx
from typing import Optional, Tuple
import asyncio

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Mumbai bounding box for validation
MUMBAI_BOUNDS = {
    "min_lat": 18.89,
    "max_lat": 19.27,
    "min_lon": 72.77,
    "max_lon": 72.99
}

async def geocode_location(location_name: str, city: str = "Mumbai, India") -> Optional[Tuple[float, float]]:
    """
    Convert a location name to coordinates using Nominatim.
    Returns (latitude, longitude) or None if not found.
    """
    query = f"{location_name}, {city}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                NOMINATIM_URL,
                params={
                    "q": query,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "in"
                },
                headers={
                    "User-Agent": "SentinelX-CrimeReporting/1.0"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                return (lat, lon)
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None


def is_within_mumbai(lat: float, lon: float) -> bool:
    """Check if coordinates fall within Mumbai's bounding box."""
    return (
        MUMBAI_BOUNDS["min_lat"] <= lat <= MUMBAI_BOUNDS["max_lat"] and
        MUMBAI_BOUNDS["min_lon"] <= lon <= MUMBAI_BOUNDS["max_lon"]
    )


# Common Mumbai localities for autocomplete
MUMBAI_LOCALITIES = [
    "Colaba", "Fort", "Churchgate", "Marine Drive", "Nariman Point",
    "Bandra West", "Bandra East", "Khar", "Santacruz", "Vile Parle",
    "Andheri West", "Andheri East", "Goregaon", "Malad", "Kandivali",
    "Borivali", "Dahisar", "Juhu", "Versova", "Lokhandwala",
    "Powai", "Vikhroli", "Ghatkopar", "Mulund", "Thane",
    "Kurla", "Chembur", "Wadala", "Dadar", "Parel", "Lower Parel",
    "Worli", "Mahim", "Byculla", "Sion", "Matunga",
    "Dharavi", "Antop Hill", "GTB Nagar", "Sewri",
    "Sakinaka", "Marol", "JVLR", "SEEPZ"
]


def get_locality_suggestions(query: str) -> list:
    """Return matching localities for autocomplete."""
    query_lower = query.lower()
    return [loc for loc in MUMBAI_LOCALITIES if query_lower in loc.lower()]


async def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    """
    Convert coordinates to a location name using Google Geocoding API.
    Falls back to nearest known Mumbai locality if API fails.
    """
    import os
    
    api_key = os.environ.get('GOOGLE_PLACES_API_KEY', 'AIzaSyB6s9dI_w83CJaxfeQZcsFiN8B9g5mqHXc')
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "latlng": f"{lat},{lon}",
                    "key": api_key,
                    "result_type": "sublocality|locality|neighborhood"
                },
                timeout=5.0
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('results'):
                for component in data['results'][0].get('address_components', []):
                    types = component.get('types', [])
                    if 'sublocality_level_1' in types or 'sublocality' in types:
                        return component['long_name']
                    if 'locality' in types:
                        return component['long_name']
                # Return formatted address if no sublocality
                return data['results'][0].get('formatted_address', '').split(',')[0]
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
    
    # Fallback: find nearest known locality
    return _find_nearest_locality(lat, lon)


def _find_nearest_locality(lat: float, lon: float) -> str:
    """Find nearest known Mumbai locality."""
    import math
    
    # Mumbai areas with coordinates
    areas = [
        (19.0438, 72.8534, 'Dharavi'), (19.0726, 72.8845, 'Kurla'),
        (19.0178, 72.8478, 'Dadar'), (19.0760, 72.8777, 'Ghatkopar'),
        (19.0330, 72.8410, 'Wadala'), (19.1136, 72.8697, 'Andheri East'),
        (19.0522, 72.8994, 'Chembur'), (19.0048, 72.8270, 'Parel'),
        (19.0596, 72.8295, 'Bandra West'), (19.1073, 72.8371, 'Vile Parle'),
        (19.1663, 72.8526, 'Goregaon'), (19.0895, 72.8656, 'Santacruz'),
        (19.1800, 72.8485, 'Malad'), (19.2183, 72.8478, 'Kandivali'),
        (18.9340, 72.8356, 'Fort'), (18.9220, 72.8347, 'Colaba'),
    ]
    
    min_dist = float('inf')
    nearest = 'Mumbai'
    
    for area_lat, area_lon, name in areas:
        dist = math.sqrt((lat - area_lat)**2 + (lon - area_lon)**2)
        if dist < min_dist:
            min_dist = dist
            nearest = name
    
    return nearest

