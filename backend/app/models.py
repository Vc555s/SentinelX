from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OFFICER = "officer"
    ANALYST = "analyst"

class CrimeType(str, enum.Enum):
    THEFT = "theft"
    ASSAULT = "assault"
    BURGLARY = "burglary"
    VANDALISM = "vandalism"
    DRUGS = "drugs"
    OTHER = "other"

class User(Base):
    """Admin/Police users (Telegram OTP login)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)  # Telegram username
    phone_number = Column(String, unique=True, index=True, nullable=True)  # With country code e.g. +919876543210
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)  # Optional - we use Telegram OTP
    full_name = Column(String)
    telegram_chat_id = Column(String, nullable=True)  # For sending OTP
    role = Column(String, default=UserRole.ADMIN)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GoogleUser(Base):
    """Citizen users (Google OAuth login)"""
    __tablename__ = "google_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    google_id = Column(String, unique=True, index=True)
    full_name = Column(String)
    profile_picture = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CrimeIncident(Base):
    __tablename__ = "crime_incidents"

    id = Column(Integer, primary_key=True, index=True)
    fir_id = Column(String, unique=True, index=True)  # External FIR ID
    crime_type = Column(String)  # Enum stored as string
    description = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    location_name = Column(String)
    severity = Column(String, default="medium")  # low, medium, high, critical
    incident_time = Column(DateTime)
    reported_time = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="reported")  # reported, investigating, closed
    reported_by = Column(Integer, nullable=True)  # User ID who reported
    
class PatrolRoute(Base):
    __tablename__ = "patrol_routes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    area_name = Column(String)
    status = Column(String)  # active, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    route_data = Column(Text)  # JSON string of lat/lngs
 
