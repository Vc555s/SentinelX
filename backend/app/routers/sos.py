"""
SOS Alerts Router - In-memory storage for real-time SOS alerts
Enables cross-portal communication between citizen and admin portals
Includes dispatch tracking for patrol units
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import random
import math

router = APIRouter(
    prefix="/sos",
    tags=["sos"],
    responses={404: {"description": "Not found"}},
)

# In-memory SOS alerts storage (in production, use Redis or DB)
sos_alerts: List[dict] = []

# Simulated patrol units with current positions
patrol_units = [
    {"id": "PATROL-01", "name": "Unit Alpha", "lat": 19.0760, "lng": 72.8777, "status": "available"},
    {"id": "PATROL-02", "name": "Unit Bravo", "lat": 19.0438, "lng": 72.8534, "status": "available"},
    {"id": "PATROL-03", "name": "Unit Charlie", "lat": 19.1136, "lng": 72.8697, "status": "available"},
    {"id": "PATROL-04", "name": "Unit Delta", "lat": 18.9340, "lng": 72.8356, "status": "available"},
    {"id": "PATROL-05", "name": "Unit Echo", "lat": 19.0596, "lng": 72.8295, "status": "available"},
]


class SOSAlertCreate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    message: Optional[str] = None


class SOSAlert(BaseModel):
    id: str
    latitude: float
    longitude: float
    address: Optional[str]
    message: str
    timestamp: str
    read: bool = False
    priority: str = "critical"
    # Dispatch tracking fields
    dispatch_status: str = "pending"  # pending, dispatched, en_route, arrived, resolved
    dispatch_unit: Optional[str] = None
    dispatch_unit_name: Optional[str] = None
    dispatch_time: Optional[str] = None
    eta_minutes: Optional[int] = None
    patrol_lat: Optional[float] = None
    patrol_lng: Optional[float] = None


class DispatchRequest(BaseModel):
    unit_id: Optional[str] = None  # If not provided, auto-assign nearest unit


@router.post("/trigger", response_model=SOSAlert)
async def trigger_sos(alert: SOSAlertCreate):
    """
    Trigger an SOS alert from the citizen portal.
    This stores the alert in memory for the admin portal to consume.
    """
    sos_id = f"SOS-{uuid.uuid4().hex[:8].upper()}"
    
    new_alert = {
        "id": sos_id,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "address": alert.address or "Unknown location",
        "message": alert.message or f"🚨 SOS EMERGENCY at {alert.address or 'unknown location'}",
        "timestamp": datetime.now().isoformat(),
        "read": False,
        "priority": "critical",
        "dispatch_status": "pending",
        "dispatch_unit": None,
        "dispatch_unit_name": None,
        "dispatch_time": None,
        "eta_minutes": None,
        "patrol_lat": None,
        "patrol_lng": None
    }
    
    sos_alerts.insert(0, new_alert)
    
    # Keep only last 100 alerts
    if len(sos_alerts) > 100:
        sos_alerts.pop()
    
    return SOSAlert(**new_alert)


@router.get("/alerts", response_model=List[SOSAlert])
async def get_sos_alerts(unread_only: bool = False):
    """
    Get all SOS alerts for the admin portal.
    """
    # Update patrol positions for dispatched alerts (simulate movement)
    for alert in sos_alerts:
        if alert["dispatch_status"] in ["dispatched", "en_route"] and alert["patrol_lat"]:
            _update_patrol_position(alert)
    
    if unread_only:
        return [SOSAlert(**a) for a in sos_alerts if not a["read"]]
    return [SOSAlert(**a) for a in sos_alerts]


@router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """Mark an SOS alert as read."""
    for alert in sos_alerts:
        if alert["id"] == alert_id:
            alert["read"] = True
            return {"success": True, "message": f"Alert {alert_id} marked as read"}
    raise HTTPException(status_code=404, detail="Alert not found")


@router.delete("/alerts/{alert_id}")
async def dismiss_alert(alert_id: str):
    """Dismiss/delete an SOS alert."""
    global sos_alerts
    
    # Also free up the patrol unit
    for alert in sos_alerts:
        if alert["id"] == alert_id and alert["dispatch_unit"]:
            _free_patrol_unit(alert["dispatch_unit"])
    
    original_len = len(sos_alerts)
    sos_alerts = [a for a in sos_alerts if a["id"] != alert_id]
    
    if len(sos_alerts) < original_len:
        return {"success": True, "message": f"Alert {alert_id} dismissed"}
    raise HTTPException(status_code=404, detail="Alert not found")


@router.post("/alerts/{alert_id}/dispatch")
async def dispatch_patrol(alert_id: str, request: DispatchRequest = None):
    """Dispatch a patrol unit to an SOS alert."""
    for alert in sos_alerts:
        if alert["id"] == alert_id:
            if alert["dispatch_status"] != "pending":
                raise HTTPException(status_code=400, detail="Alert already dispatched")
            
            # Find available patrol unit
            unit = None
            if request and request.unit_id:
                unit = next((u for u in patrol_units if u["id"] == request.unit_id and u["status"] == "available"), None)
            else:
                # Auto-assign nearest available unit
                unit = _find_nearest_available_unit(alert["latitude"], alert["longitude"])
            
            if not unit:
                raise HTTPException(status_code=400, detail="No available patrol units")
            
            # Calculate ETA based on distance (rough estimate: 2km per minute in city)
            distance = _calculate_distance(unit["lat"], unit["lng"], alert["latitude"], alert["longitude"])
            eta = max(1, int(distance / 0.5))  # 0.5 km per minute average
            
            # Update alert
            alert["dispatch_status"] = "dispatched"
            alert["dispatch_unit"] = unit["id"]
            alert["dispatch_unit_name"] = unit["name"]
            alert["dispatch_time"] = datetime.now().isoformat()
            alert["eta_minutes"] = eta
            alert["patrol_lat"] = unit["lat"]
            alert["patrol_lng"] = unit["lng"]
            
            # Mark unit as busy
            unit["status"] = "dispatched"
            
            return {
                "success": True,
                "message": f"Patrol {unit['name']} dispatched",
                "unit": unit["name"],
                "eta_minutes": eta,
                "patrol_lat": unit["lat"],
                "patrol_lng": unit["lng"]
            }
    
    raise HTTPException(status_code=404, detail="Alert not found")


@router.put("/alerts/{alert_id}/status")
async def update_dispatch_status(alert_id: str, status: str):
    """Update the dispatch status of an alert."""
    valid_statuses = ["pending", "dispatched", "en_route", "arrived", "resolved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    for alert in sos_alerts:
        if alert["id"] == alert_id:
            old_status = alert["dispatch_status"]
            alert["dispatch_status"] = status
            
            # If resolved, free the patrol unit
            if status == "resolved" and alert["dispatch_unit"]:
                _free_patrol_unit(alert["dispatch_unit"])
                alert["eta_minutes"] = 0
            
            return {"success": True, "message": f"Status updated from {old_status} to {status}"}
    
    raise HTTPException(status_code=404, detail="Alert not found")


@router.get("/units")
async def get_patrol_units():
    """Get all patrol units and their current status/position."""
    return patrol_units


@router.get("/count")
async def get_sos_count():
    """Get count of unread SOS alerts."""
    unread = sum(1 for a in sos_alerts if not a["read"])
    pending = sum(1 for a in sos_alerts if a["dispatch_status"] == "pending")
    dispatched = sum(1 for a in sos_alerts if a["dispatch_status"] in ["dispatched", "en_route"])
    return {"total": len(sos_alerts), "unread": unread, "pending": pending, "dispatched": dispatched}


def _calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate approximate distance in km between two coordinates."""
    # Simple Euclidean approximation (good enough for city scale)
    lat_diff = (lat2 - lat1) * 111  # 1 degree lat ≈ 111 km
    lng_diff = (lng2 - lng1) * 85   # 1 degree lng ≈ 85 km at Mumbai latitude
    return math.sqrt(lat_diff**2 + lng_diff**2)


def _find_nearest_available_unit(target_lat: float, target_lng: float):
    """Find the nearest available patrol unit."""
    available = [u for u in patrol_units if u["status"] == "available"]
    if not available:
        return None
    return min(available, key=lambda u: _calculate_distance(u["lat"], u["lng"], target_lat, target_lng))


def _free_patrol_unit(unit_id: str):
    """Mark a patrol unit as available again."""
    for unit in patrol_units:
        if unit["id"] == unit_id:
            unit["status"] = "available"
            break


def _update_patrol_position(alert: dict):
    """Simulate patrol movement toward the SOS location."""
    if not alert["patrol_lat"] or not alert["patrol_lng"]:
        return
    
    target_lat = alert["latitude"]
    target_lng = alert["longitude"]
    current_lat = alert["patrol_lat"]
    current_lng = alert["patrol_lng"]
    
    # Calculate distance
    distance = _calculate_distance(current_lat, current_lng, target_lat, target_lng)
    
    # If close enough, mark as arrived
    if distance < 0.05:  # Within 50 meters
        alert["dispatch_status"] = "arrived"
        alert["eta_minutes"] = 0
        alert["patrol_lat"] = target_lat
        alert["patrol_lng"] = target_lng
        return
    
    # Move toward target (simulate ~0.005 degrees per poll = ~500m)
    move_factor = min(0.005 / distance, 1.0)  # Don't overshoot
    alert["patrol_lat"] = current_lat + (target_lat - current_lat) * move_factor
    alert["patrol_lng"] = current_lng + (target_lng - current_lng) * move_factor
    
    # Update ETA
    new_distance = _calculate_distance(alert["patrol_lat"], alert["patrol_lng"], target_lat, target_lng)
    alert["eta_minutes"] = max(1, int(new_distance / 0.5))
    
    # Update status to en_route after first movement
    if alert["dispatch_status"] == "dispatched":
        alert["dispatch_status"] = "en_route"

