"""
Predictions API Router
Provides endpoints for crime hotspot predictions using the ML model.
"""

from fastapi import APIRouter, Query
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import sys
import os

# Add ml_engine to path for importing the predictor
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml_engine/src")))

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
)


class HotspotPrediction(BaseModel):
    latitude: float
    longitude: float
    risk_score: float
    predicted_crime_type: str
    risk_level: str
    time: str
    location_name: Optional[str] = None


class PredictionResponse(BaseModel):
    hotspots: List[HotspotPrediction]
    generated_at: str
    target_time: str


@router.get("/hotspots", response_model=PredictionResponse)
async def get_predicted_hotspots(
    hour: Optional[int] = Query(None, ge=0, le=23, description="Target hour (0-23)"),
    day: Optional[int] = Query(None, ge=0, le=6, description="Target day of week (0=Monday)")
):
    """
    Get predicted crime hotspots using the trained ML model.
    Optionally specify target hour and day for future predictions.
    """
    try:
        from hotspot_predictor import CrimeHotspotPredictor
        
        # Use the correct relative path to the model
        model_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml_engine', 'models', 'hotspot_model.joblib')
        
        predictor = CrimeHotspotPredictor(model_path=model_path)
        
        # Build target time
        target_time = datetime.now()
        if day is not None:
             days_ahead = (day - target_time.weekday() + 7) % 7
             target_time += timedelta(days=days_ahead)
        
        if hour is not None:
            target_time = target_time.replace(hour=hour, minute=0, second=0)
        
        try:
            hotspots = predictor.predict_hotspots(target_time=target_time)
            # Add location names to ML predictions
            hotspots = [_add_location_name(h) for h in hotspots]
        except ValueError as e:
            # Fallback to mock data only if model loading fails completely
            print(f"Model error: {e}")
            hotspots = _get_mock_hotspots(target_time)
        
        return PredictionResponse(
            hotspots=[HotspotPrediction(**h) for h in hotspots],
            generated_at=datetime.now().isoformat(),
            target_time=target_time.isoformat()
        )
        
    except ImportError as e:
        print(f"Import error: {e}")
        # ML engine not available - return mock data
        target_time = datetime.now()
        hotspots = _get_mock_hotspots(target_time)
        return PredictionResponse(
            hotspots=[HotspotPrediction(**h) for h in hotspots],
            generated_at=datetime.now().isoformat(),
            target_time=target_time.isoformat()
        )


# Mumbai area reference for location lookup - granular sub-areas with landmarks
MUMBAI_AREAS = [
    # Dharavi and surroundings
    {'lat': 19.0438, 'lon': 72.8534, 'name': 'Dharavi'},
    {'lat': 19.0410, 'lon': 72.8510, 'name': 'Dharavi Cross Road'},
    {'lat': 19.0455, 'lon': 72.8560, 'name': 'Dharavi Transit Camp'},
    # Kurla
    {'lat': 19.0726, 'lon': 72.8845, 'name': 'Kurla Station'},
    {'lat': 19.0700, 'lon': 72.8800, 'name': 'Kurla West'},
    {'lat': 19.0750, 'lon': 72.8900, 'name': 'Kurla Terminus'},
    # Dadar
    {'lat': 19.0178, 'lon': 72.8478, 'name': 'Dadar Central'},
    {'lat': 19.0210, 'lon': 72.8430, 'name': 'Dadar West'},
    {'lat': 19.0195, 'lon': 72.8520, 'name': 'Dadar Station East'},
    {'lat': 19.0150, 'lon': 72.8440, 'name': 'Dadar Flower Market'},
    # Ghatkopar
    {'lat': 19.0760, 'lon': 72.8777, 'name': 'Ghatkopar Station'},
    {'lat': 19.0780, 'lon': 72.8750, 'name': 'Ghatkopar West'},
    {'lat': 19.0740, 'lon': 72.8810, 'name': 'Ghatkopar East'},
    # Western Line suburbs
    {'lat': 19.0330, 'lon': 72.8410, 'name': 'Wadala Station'},
    {'lat': 19.1136, 'lon': 72.8697, 'name': 'Andheri Station East'},
    {'lat': 19.1160, 'lon': 72.8460, 'name': 'Andheri West'},
    {'lat': 19.1180, 'lon': 72.8720, 'name': 'Andheri Subway'},
    {'lat': 19.0522, 'lon': 72.8994, 'name': 'Chembur Station'},
    {'lat': 19.0500, 'lon': 72.8960, 'name': 'Chembur Naka'},
    {'lat': 19.0048, 'lon': 72.8270, 'name': 'Lower Parel'},
    {'lat': 19.0080, 'lon': 72.8310, 'name': 'Parel Station'},
    {'lat': 19.1197, 'lon': 72.8468, 'name': 'Jogeshwari Station'},
    {'lat': 19.1220, 'lon': 72.8500, 'name': 'Jogeshwari East'},
    {'lat': 19.0596, 'lon': 72.8295, 'name': 'Bandra Station West'},
    {'lat': 19.0620, 'lon': 72.8320, 'name': 'Bandra Linking Road'},
    {'lat': 19.0544, 'lon': 72.8402, 'name': 'Bandra Terminus'},
    {'lat': 19.1073, 'lon': 72.8371, 'name': 'Vile Parle Station'},
    {'lat': 19.1095, 'lon': 72.8400, 'name': 'Vile Parle East'},
    {'lat': 19.1663, 'lon': 72.8526, 'name': 'Goregaon Station'},
    {'lat': 19.1680, 'lon': 72.8500, 'name': 'Goregaon West'},
    {'lat': 19.0895, 'lon': 72.8656, 'name': 'Santacruz Station'},
    {'lat': 19.0920, 'lon': 72.8630, 'name': 'Santacruz West'},
    {'lat': 19.1800, 'lon': 72.8485, 'name': 'Malad Station'},
    {'lat': 19.1820, 'lon': 72.8460, 'name': 'Malad West Link Road'},
    {'lat': 19.2033, 'lon': 72.8418, 'name': 'Malad Mindspace'},
    {'lat': 19.2183, 'lon': 72.8478, 'name': 'Kandivali Station'},
    {'lat': 19.2200, 'lon': 72.8500, 'name': 'Kandivali West'},
    {'lat': 19.2502, 'lon': 72.8601, 'name': 'Borivali Station'},
    {'lat': 19.2520, 'lon': 72.8570, 'name': 'Borivali West'},
    {'lat': 19.2480, 'lon': 72.8640, 'name': 'Borivali East IC Colony'},
    # South Mumbai
    {'lat': 18.9340, 'lon': 72.8356, 'name': 'Fort CST Area'},
    {'lat': 18.9400, 'lon': 72.8350, 'name': 'Flora Fountain'},
    {'lat': 18.9220, 'lon': 72.8347, 'name': 'Colaba Causeway'},
    {'lat': 18.9260, 'lon': 72.8320, 'name': 'Colaba Market'},
    {'lat': 18.9752, 'lon': 72.8311, 'name': 'Marine Lines Station'},
    {'lat': 18.9700, 'lon': 72.8300, 'name': 'Marine Drive'},
    # Central suburbs
    {'lat': 19.0176, 'lon': 72.8562, 'name': 'Sion Station'},
    {'lat': 19.0190, 'lon': 72.8540, 'name': 'Sion Circle'},
    {'lat': 19.0509, 'lon': 72.8406, 'name': 'Mahim Station'},
    {'lat': 19.0530, 'lon': 72.8370, 'name': 'Mahim Causeway'},
    {'lat': 19.1420, 'lon': 72.8380, 'name': 'Oshiwara'},
    {'lat': 19.0827, 'lon': 72.8892, 'name': 'Vikhroli Station'},
    {'lat': 19.0665, 'lon': 72.8720, 'name': 'Sion-Koliwada'},
    {'lat': 19.1200, 'lon': 72.9100, 'name': 'Powai Lake'},
    {'lat': 19.1180, 'lon': 72.9050, 'name': 'Powai Hiranandani'},
    {'lat': 19.0621, 'lon': 72.8350, 'name': 'Khar Station'},
    {'lat': 19.0640, 'lon': 72.8380, 'name': 'Khar Danda'},
    {'lat': 19.0900, 'lon': 72.8280, 'name': 'Juhu Beach'},
    {'lat': 19.0880, 'lon': 72.8310, 'name': 'Juhu Tara Road'},
    {'lat': 19.0098, 'lon': 72.8298, 'name': 'Worli Sea Face'},
    {'lat': 19.0120, 'lon': 72.8270, 'name': 'Worli Naka'},
]


def _get_nearest_area(lat: float, lon: float) -> str:
    """Find nearest Mumbai area name for given coordinates."""
    import math
    min_dist = float('inf')
    nearest = 'Mumbai'
    
    for area in MUMBAI_AREAS:
        dist = math.sqrt((lat - area['lat'])**2 + (lon - area['lon'])**2)
        if dist < min_dist:
            min_dist = dist
            nearest = area['name']
    
    # If too far from any known area (> ~1km), try Google Geocoding
    if min_dist > 0.015:  # Approximately 1.5km
        google_name = _reverse_geocode_google(lat, lon)
        if google_name:
            return google_name
    
    return nearest


def _reverse_geocode_google(lat: float, lon: float) -> Optional[str]:
    """Use Google Geocoding API to get location name."""
    import requests
    
    api_key = os.environ.get('GOOGLE_PLACES_API_KEY', 'AIzaSyB6s9dI_w83CJaxfeQZcsFiN8B9g5mqHXc')
    try:
        url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={api_key}&result_type=sublocality|locality"
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                # Get the first result's address components
                for component in data['results'][0].get('address_components', []):
                    if 'sublocality' in component.get('types', []):
                        return component['long_name']
                    if 'locality' in component.get('types', []):
                        return component['long_name']
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    return None


def _add_location_name(hotspot: dict) -> dict:
    """Add location_name to hotspot prediction."""
    if 'location_name' not in hotspot or not hotspot.get('location_name'):
        hotspot['location_name'] = _get_nearest_area(
            hotspot['latitude'], 
            hotspot['longitude']
        )
    return hotspot


def _get_mock_hotspots(target_time: datetime) -> List[dict]:
    """Return mock hotspot data for demo purposes based on Mumbai crime statistics."""
    import random
    
    hour = target_time.hour
    day_of_week = target_time.weekday()  # 0 = Monday, 6 = Sunday
    # Use hour and day as seed so locations change with time and day
    random.seed(hour * 17 + day_of_week * 29 + 7)  # Different seed per hour and day
    
    # Mumbai areas with crime distribution weights (based on real data patterns)
    # Higher weight = more crime activity
    mumbai_areas = [
        # High crime areas
        {'lat': 19.0438, 'lon': 72.8534, 'name': 'Dharavi', 'weight': 0.9, 'peak_hours': [22, 23, 0, 1, 2, 3]},
        {'lat': 19.0726, 'lon': 72.8845, 'name': 'Kurla', 'weight': 0.85, 'peak_hours': [20, 21, 22, 23]},
        {'lat': 19.0178, 'lon': 72.8478, 'name': 'Dadar Central', 'weight': 0.8, 'peak_hours': [8, 9, 17, 18, 19]},
        {'lat': 19.0760, 'lon': 72.8777, 'name': 'Ghatkopar', 'weight': 0.78, 'peak_hours': [7, 8, 18, 19, 20]},
        {'lat': 19.0330, 'lon': 72.8410, 'name': 'Wadala', 'weight': 0.75, 'peak_hours': [21, 22, 23, 0, 1]},
        # Medium-high crime areas
        {'lat': 19.1136, 'lon': 72.8697, 'name': 'Andheri East', 'weight': 0.72, 'peak_hours': [9, 10, 18, 19, 20, 21]},
        {'lat': 19.0522, 'lon': 72.8994, 'name': 'Chembur', 'weight': 0.70, 'peak_hours': [19, 20, 21, 22]},
        {'lat': 19.0048, 'lon': 72.8270, 'name': 'Parel', 'weight': 0.68, 'peak_hours': [12, 13, 18, 19]},
        {'lat': 19.1197, 'lon': 72.8468, 'name': 'Jogeshwari', 'weight': 0.65, 'peak_hours': [22, 23, 0, 1, 2]},
        {'lat': 19.0596, 'lon': 72.8295, 'name': 'Bandra West', 'weight': 0.62, 'peak_hours': [20, 21, 22, 23, 0]},
        {'lat': 19.1073, 'lon': 72.8371, 'name': 'Vile Parle', 'weight': 0.60, 'peak_hours': [7, 8, 9, 18, 19]},
        # Medium crime areas
        {'lat': 19.1663, 'lon': 72.8526, 'name': 'Goregaon', 'weight': 0.55, 'peak_hours': [10, 11, 19, 20, 21]},
        {'lat': 19.0895, 'lon': 72.8656, 'name': 'Santacruz', 'weight': 0.52, 'peak_hours': [8, 9, 17, 18]},
        {'lat': 19.1800, 'lon': 72.8485, 'name': 'Malad', 'weight': 0.50, 'peak_hours': [21, 22, 23, 0]},
        {'lat': 19.2183, 'lon': 72.8478, 'name': 'Kandivali', 'weight': 0.48, 'peak_hours': [19, 20, 21]},
        {'lat': 19.2502, 'lon': 72.8601, 'name': 'Borivali', 'weight': 0.45, 'peak_hours': [6, 7, 18, 19]},
        # Lower crime areas
        {'lat': 18.9340, 'lon': 72.8356, 'name': 'Fort', 'weight': 0.40, 'peak_hours': [10, 11, 12, 13, 14]},
        {'lat': 18.9220, 'lon': 72.8347, 'name': 'Colaba', 'weight': 0.38, 'peak_hours': [22, 23, 0, 1]},
        {'lat': 18.9752, 'lon': 72.8311, 'name': 'Marine Lines', 'weight': 0.35, 'peak_hours': [20, 21, 22]},
        {'lat': 19.0176, 'lon': 72.8562, 'name': 'Sion', 'weight': 0.42, 'peak_hours': [18, 19, 20, 21]},
        {'lat': 19.0509, 'lon': 72.8406, 'name': 'Mahim', 'weight': 0.44, 'peak_hours': [19, 20, 21, 22]},
        {'lat': 19.1420, 'lon': 72.8380, 'name': 'Oshiwara', 'weight': 0.46, 'peak_hours': [21, 22, 23, 0]},
        {'lat': 19.0827, 'lon': 72.8892, 'name': 'Vikhroli', 'weight': 0.50, 'peak_hours': [8, 9, 17, 18, 19]},
        {'lat': 19.0665, 'lon': 72.8720, 'name': 'Sion-Koliwada', 'weight': 0.55, 'peak_hours': [19, 20, 21, 22]},
        {'lat': 19.2033, 'lon': 72.8418, 'name': 'Malad West', 'weight': 0.42, 'peak_hours': [20, 21, 22, 23]},
    ]
    
    # Crime types with their relative frequency
    crime_types = [
        ('Theft', 0.45),
        ('Assault', 0.20),
        ('Molestation', 0.15),
        ('Robbery', 0.08),
        ('Burglary', 0.05),
        ('Murder', 0.02),
        ('Riots', 0.03),
        ('Vandalism', 0.02),
    ]
    
    # Time-based risk multipliers
    night_multiplier = 1.4 if (hour >= 22 or hour <= 5) else 1.0
    evening_multiplier = 1.25 if (18 <= hour <= 21) else 1.0
    early_morning_mult = 1.15 if (5 < hour <= 7) else 1.0
    
    hotspots = []
    
    # Filter areas based on hour - only show areas active at this hour
    active_areas = [area for area in mumbai_areas if hour in area['peak_hours'] or random.random() < 0.3]
    
    # Generate hotspots for each active area
    for area in active_areas:
        # Is this a peak hour for this area?
        is_peak = hour in area['peak_hours']
        
        # Number of hotspots per area
        num_points = (int(area['weight'] * 3) + 1) if is_peak else 1
        
        for i in range(num_points):
            # Add random jitter to spread points within the area
            jitter_lat = random.uniform(-0.006, 0.006)
            jitter_lon = random.uniform(-0.006, 0.006)
            
            lat = area['lat'] + jitter_lat
            lon = area['lon'] + jitter_lon
            
            # Calculate risk with time adjustments
            peak_bonus = 0.2 if is_peak else 0
            base_risk = area['weight'] + random.uniform(-0.1, 0.15) + peak_bonus
            risk = min(base_risk * night_multiplier * evening_multiplier * early_morning_mult, 1.0)
            risk = max(risk, 0.15)
            
            # Determine risk level
            if risk >= 0.7:
                risk_level = 'critical'
            elif risk >= 0.5:
                risk_level = 'high'
            elif risk >= 0.3:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            # Select crime type based on weighted probability
            rand_val = random.random()
            cumulative = 0
            crime_type = 'Theft'
            for ct, prob in crime_types:
                cumulative += prob
                if rand_val <= cumulative:
                    crime_type = ct
                    break
            
            hotspots.append({
                'latitude': round(lat, 6),
                'longitude': round(lon, 6),
                'risk_score': round(risk, 2),
                'predicted_crime_type': crime_type,
                'risk_level': risk_level,
                'time': target_time.isoformat(),
                'location_name': area['name']
            })
    
    # Sort by risk score (highest first)
    return sorted(hotspots, key=lambda x: x['risk_score'], reverse=True)[:25]  # Limit to top 25


@router.post("/report-for-training")
async def report_crime_for_training(
    latitude: float,
    longitude: float,
    crime_type: str,
    incident_time: datetime
):
    """
    Endpoint to receive crime reports for continuous model training.
    This triggers incremental model updates.
    """
    try:
        from hotspot_predictor import CrimeHotspotPredictor
        
        # Use the correct relative path to the model
        model_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml_engine', 'models', 'hotspot_model.joblib')
        
        predictor = CrimeHotspotPredictor(model_path=model_path)
        predictor.load_model()
        predictor.incremental_update({
            'latitude': latitude,
            'longitude': longitude,
            'crime_type': crime_type,
            'incident_time': incident_time.isoformat()
        })
        
        return {"status": "received", "message": "Crime report queued for model update"}
    except Exception as e:
        return {"status": "received", "message": f"Noted (model update pending): {str(e)}"}
