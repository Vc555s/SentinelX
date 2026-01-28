from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timedelta

from .. import schemas, models, database
from .auth import get_current_user

router = APIRouter(
    prefix="/patrols",
    tags=["patrols"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
async def get_patrol_routes(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.PatrolRoute))
    routes = result.scalars().all()
    
    # Format for frontend
    return [
        {
            "id": r.id,
            "name": r.name,
            "officer": "Officer",  # Placeholder - would need officer relationship
            "status": r.status,
            "area_name": r.area_name,
            "coordinates": r.route_data,  # JSON stored as text
        }
        for r in routes
    ]

@router.post("/")
async def create_patrol_route(
    name: str,
    area_name: str,
    route_data: str,  # JSON string of coordinates
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_route = models.PatrolRoute(
        name=name,
        area_name=area_name,
        route_data=route_data,
        status="active"
    )
    db.add(new_route)
    await db.commit()
    await db.refresh(new_route)
    return {"id": new_route.id, "message": "Patrol route created"}
