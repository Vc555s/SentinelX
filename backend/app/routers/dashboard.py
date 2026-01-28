from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from .. import models, database
from .auth import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_48h = now - timedelta(hours=48)
    
    # Count incidents in last 24h
    result_24h = await db.execute(
        select(func.count(models.CrimeIncident.id))
        .where(models.CrimeIncident.reported_time >= last_24h)
    )
    total_24h = result_24h.scalar() or 0
    
    # Count incidents in previous 24h (24h-48h ago) for change calculation
    result_prev = await db.execute(
        select(func.count(models.CrimeIncident.id))
        .where(models.CrimeIncident.reported_time >= last_48h)
        .where(models.CrimeIncident.reported_time < last_24h)
    )
    total_prev = result_prev.scalar() or 0
    
    incident_change = total_24h - total_prev
    
    # Count active patrols
    result_patrols = await db.execute(
        select(func.count(models.PatrolRoute.id))
        .where(models.PatrolRoute.status == "active")
    )
    patrols_active = result_patrols.scalar() or 0
    
    # Resolution rate (resolved / total)
    result_resolved = await db.execute(
        select(func.count(models.CrimeIncident.id))
        .where(models.CrimeIncident.status == "closed")
    )
    resolved = result_resolved.scalar() or 0
    
    result_total = await db.execute(select(func.count(models.CrimeIncident.id)))
    total_all = result_total.scalar() or 1  # Avoid division by zero
    
    resolution_rate = round((resolved / total_all) * 100, 1)
    
    return {
        "totalIncidents24h": total_24h,
        "highAlertZones": 3,  # Placeholder - would come from hotspot analysis
        "patrolsActive": patrols_active,
        "resolutionRate": resolution_rate,
        "incidentChange": incident_change,
        "alertChange": 0,
        "patrolChange": 0,
        "resolutionChange": 0,
    }
