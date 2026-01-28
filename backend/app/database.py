from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinelx.db"
    
    # JWT/Auth
    SECRET_KEY: str = "sentinelx-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google OAuth (optional - for User Portal)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    
    # Telegram Bot (for Admin OTP)
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    
    # Frontend URLs
    ADMIN_FRONTEND_URL: str = "http://localhost:8081"
    USER_FRONTEND_URL: str = "http://localhost:8080"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore any extra env vars not defined here

settings = Settings()

Base = declarative_base()

engine = create_async_engine(settings.DATABASE_URL, echo=True)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with async_session() as session:
        yield session

