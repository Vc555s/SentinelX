from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from .. import schemas, models, database
from .auth import get_current_user
# Import from ml_engine (assuming it's in python path or we adjust path)
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from ml_engine.src import hotspots, prediction

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/hotspots")
async def get_crime_hotspots(
    crime_type: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = select(models.CrimeIncident)
    if crime_type:
        query = query.where(models.CrimeIncident.crime_type == crime_type)
        
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    # Convert to list of dicts for ML processing
    incident_data = [
        {
            "latitude": i.latitude,
            "longitude": i.longitude,
            "crime_type": i.crime_type,
            "id": i.id
        } 
        for i in incidents
    ]
    
    return hotspots.detect_hotspots(incident_data)

@router.get("/trends")
async def get_crime_trends(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.CrimeIncident))
    incidents = result.scalars().all()
    
    data = [
        {"incident_time": i.incident_time}
        for i in incidents if i.incident_time
    ]
    
    return prediction.predict_trends(data)
