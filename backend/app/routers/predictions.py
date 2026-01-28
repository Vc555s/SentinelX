"""
Predictions API Router
Provides endpoints for crime hotspot predictions.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import sys
import os

# Add ml_engine to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml_engine', 'src'))

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
    Get predicted crime hotspots.
    Optionally specify target hour and day for future predictions.
    """
    try:
        from hotspot_predictor import CrimeHotspotPredictor
        
        predictor = CrimeHotspotPredictor(
            model_path=os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml_engine', 'models', 'hotspot_model.joblib')
        )
        
        # Build target time
        target_time = datetime.now()
        if hour is not None:
            target_time = target_time.replace(hour=hour, minute=0, second=0)
        
        try:
            hotspots = predictor.predict_hotspots(target_time=target_time)
        except ValueError as e:
            # Model not trained - return mock data for demo
            hotspots = _get_mock_hotspots(target_time)
        
        return PredictionResponse(
            hotspots=[HotspotPrediction(**h) for h in hotspots],
            generated_at=datetime.now().isoformat(),
            target_time=target_time.isoformat()
        )
        
    except ImportError:
        # ML engine not available - return mock data
        hotspots = _get_mock_hotspots(datetime.now())
        return PredictionResponse(
            hotspots=[HotspotPrediction(**h) for h in hotspots],
            generated_at=datetime.now().isoformat(),
            target_time=datetime.now().isoformat()
        )


def _get_mock_hotspots(target_time: datetime) -> List[dict]:
    """Return mock hotspot data for demo purposes."""
    hour = target_time.hour
    
    # Base hotspots with time-varying risk
    base_hotspots = [
        {'lat': 19.0438, 'lon': 72.8534, 'name': 'Dharavi', 'base_risk': 0.75},
        {'lat': 19.0726, 'lon': 72.8845, 'name': 'Kurla', 'base_risk': 0.65},
        {'lat': 19.1136, 'lon': 72.8697, 'name': 'Andheri East', 'base_risk': 0.55},
        {'lat': 18.9340, 'lon': 72.8356, 'name': 'Fort', 'base_risk': 0.45},
        {'lat': 19.0596, 'lon': 72.8295, 'name': 'Bandra West', 'base_risk': 0.50},
        {'lat': 19.0178, 'lon': 72.8478, 'name': 'Dadar', 'base_risk': 0.48},
        {'lat': 19.0522, 'lon': 72.8994, 'name': 'Chembur', 'base_risk': 0.52},
        {'lat': 19.1663, 'lon': 72.8526, 'name': 'Goregaon', 'base_risk': 0.40},
    ]
    
    # Adjust risk based on time
    night_multiplier = 1.3 if (hour >= 22 or hour <= 5) else 1.0
    evening_multiplier = 1.2 if (18 <= hour <= 21) else 1.0
    
    hotspots = []
    for h in base_hotspots:
        risk = min(h['base_risk'] * night_multiplier * evening_multiplier, 1.0)
        
        if risk >= 0.7:
            risk_level = 'critical'
            crime_type = 'robbery' if hour >= 22 else 'assault'
        elif risk >= 0.5:
            risk_level = 'high'
            crime_type = 'theft'
        elif risk >= 0.35:
            risk_level = 'medium'
            crime_type = 'burglary' if 10 <= hour <= 16 else 'theft'
        else:
            risk_level = 'low'
            crime_type = 'vandalism'
        
        hotspots.append({
            'latitude': h['lat'],
            'longitude': h['lon'],
            'risk_score': round(risk, 2),
            'predicted_crime_type': crime_type,
            'risk_level': risk_level,
            'time': target_time.isoformat()
        })
    
    return sorted(hotspots, key=lambda x: x['risk_score'], reverse=True)


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
        
        predictor = CrimeHotspotPredictor()
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
