from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "officer"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CrimeIncidentBase(BaseModel):
    fir_id: str
    crime_type: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: str
    incident_time: datetime
    status: str = "reported"

class CrimeIncidentCreate(CrimeIncidentBase):
    pass

class CrimeIncident(CrimeIncidentBase):
    id: int
    reported_time: datetime

    class Config:
        from_attributes = True

# New schema for Admin crime reporting (allows location name OR coordinates)
class CrimeReportCreate(BaseModel):
    """Schema for police/admin to report a crime."""
    crime_type: str
    description: Optional[str] = None
    location_name: Optional[str] = None  # e.g., "Andheri West, Mumbai"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    incident_time: datetime
    
    @field_validator('crime_type')
    @classmethod
    def validate_crime_type(cls, v):
        valid_types = ['theft', 'assault', 'burglary', 'vandalism', 'robbery', 'drugs', 'murder', 'fraud', 'other']
        if v.lower() not in valid_types:
            raise ValueError(f'crime_type must be one of: {valid_types}')
        return v.lower()

class CrimeReportResponse(BaseModel):
    id: int
    fir_id: str
    crime_type: str
    latitude: float
    longitude: float
    location_name: str
    incident_time: datetime
    status: str
    message: str

    class Config:
        from_attributes = True

# Google OAuth User
class GoogleUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    google_id: str
    profile_picture: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

