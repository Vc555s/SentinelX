from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from datetime import datetime

from .. import schemas, models, database
from .auth import get_current_user
from ..utils import ingestion
from ..utils.geocoder import geocode_location

router = APIRouter(
    prefix="/incidents",
    tags=["incidents"],
    responses={404: {"description": "Not found"}},
)

def generate_fir_id() -> str:
    """Generate a unique FIR ID."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"FIR-{timestamp}-{unique_id}"


@router.post("/report", response_model=schemas.CrimeReportResponse, status_code=status.HTTP_201_CREATED)
async def report_crime(
    report: schemas.CrimeReportCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Report a new crime incident (Admin/Police endpoint).
    Accepts either coordinates OR location_name for geocoding.
    """
    latitude = report.latitude
    longitude = report.longitude
    location_name = report.location_name or ""
    
    # If no coordinates provided, geocode the location name
    if latitude is None or longitude is None:
        if not report.location_name:
            raise HTTPException(
                status_code=400, 
                detail="Either coordinates (latitude, longitude) or location_name must be provided"
            )
        
        coords = await geocode_location(report.location_name)
        if coords is None:
            raise HTTPException(
                status_code=400,
                detail=f"Could not geocode location: {report.location_name}. Please provide coordinates manually."
            )
        latitude, longitude = coords
    
    # Generate FIR ID
    fir_id = generate_fir_id()
    
    # Create incident
    db_incident = models.CrimeIncident(
        fir_id=fir_id,
        crime_type=report.crime_type,
        description=report.description,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name if location_name else f"{latitude:.4f}, {longitude:.4f}",
        incident_time=report.incident_time,
        status="reported",
        reported_by=current_user.id
    )
    
    db.add(db_incident)
    await db.commit()
    await db.refresh(db_incident)
    
    return schemas.CrimeReportResponse(
        id=db_incident.id,
        fir_id=db_incident.fir_id,
        crime_type=db_incident.crime_type,
        latitude=db_incident.latitude,
        longitude=db_incident.longitude,
        location_name=db_incident.location_name,
        incident_time=db_incident.incident_time,
        status=db_incident.status,
        message=f"Crime reported successfully. FIR ID: {fir_id}"
    )


@router.get("/localities", response_model=List[str])
async def get_locality_suggestions(q: str = ""):
    """Get locality suggestions for autocomplete."""
    from ..utils.geocoder import get_locality_suggestions
    return get_locality_suggestions(q)


@router.post("/upload_csv", status_code=status.HTTP_201_CREATED)
async def upload_incidents_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")
    
    contents = await file.read()
    try:
        raw_data = ingestion.parse_csv_data(contents)
        processed_count = 0
        
        for row in raw_data:
            incident_data = ingestion.map_csv_to_incident_schema(row)
            
            if not all([incident_data['latitude'], incident_data['longitude'], incident_data['incident_time']]):
                continue
                
            try:
                existing = await db.execute(select(models.CrimeIncident).where(models.CrimeIncident.fir_id == incident_data['fir_id']))
                if existing.scalars().first():
                    continue

                db_incident = models.CrimeIncident(**incident_data)
                db.add(db_incident)
                processed_count += 1
            except Exception as e:
                continue
        
        await db.commit()
        return {"message": f"Successfully processed {processed_count} incidents."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@router.post("/", response_model=schemas.CrimeIncident)
async def create_incident(
    incident: schemas.CrimeIncidentCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_incident = models.CrimeIncident(**incident.model_dump())
    db.add(db_incident)
    await db.commit()
    await db.refresh(db_incident)
    return db_incident


@router.get("/", response_model=List[schemas.CrimeIncident])
async def read_incidents(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.CrimeIncident).offset(skip).limit(limit))
    incidents = result.scalars().all()
    return incidents


@router.get("/public", response_model=List[schemas.CrimeIncident])
async def read_public_incidents(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(database.get_db)
):
    """Public endpoint for user portal (no auth required)."""
    result = await db.execute(select(models.CrimeIncident).offset(skip).limit(limit))
    incidents = result.scalars().all()
    return incidents
