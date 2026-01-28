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
