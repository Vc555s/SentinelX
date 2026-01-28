"""
Telegram OTP Authentication for Admin Portal.
Uses Telegram bot to send OTP codes for secure admin login.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import httpx
import random
import string

from ..database import get_db, settings
from ..models import User
from jose import jwt

router = APIRouter(
    prefix="/auth/admin",
    tags=["admin-auth"],
)

# Store OTPs temporarily (in production, use Redis)
otp_store: dict = {}

# JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours for admin


class OTPRequest(BaseModel):
    telegram_username: str


class OTPVerify(BaseModel):
    telegram_username: str
    otp: str


class AdminUser(BaseModel):
    id: int
    telegram_username: str
    full_name: str
    badge_number: str
    role: str


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def create_admin_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT token for admin user."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "admin"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def send_telegram_otp(bot_token: str, chat_id: str, otp: str, username: str) -> bool:
    """Send OTP via Telegram bot."""
    if not bot_token or not chat_id:
        return False
    
    message = (
        f"🔐 *SentinelX Admin Login*\n\n"
        f"Your OTP code is: `{otp}`\n\n"
        f"This code expires in 5 minutes.\n"
        f"If you didn't request this, ignore this message."
    )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "Markdown"
                }
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Failed to send Telegram OTP: {e}")
        return False


@router.post("/request-otp")
async def request_otp(
    request: OTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request OTP for admin login.
    Sends OTP to admin's registered Telegram account.
    """
    telegram_username = request.telegram_username.lower().strip().lstrip('@')
    
    # Check if admin exists
    result = await db.execute(
        select(User).where(
            User.username == telegram_username,
            User.is_active == True
        )
    )
    admin = result.scalars().first()
    
    if not admin:
        # Don't reveal if user exists or not
        return {"message": "If you're a registered admin, you'll receive an OTP on Telegram."}
    
    # Generate OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)
    
    # Store OTP
    otp_store[telegram_username] = {
        "otp": otp,
        "expiry": expiry,
        "attempts": 0
    }
    
    # For demo: Print OTP since we don't have a Telegram bot configured
    # In production, send via Telegram bot
    telegram_bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    telegram_chat_id = getattr(admin, 'telegram_chat_id', None)
    
    if telegram_bot_token and telegram_chat_id:
        sent = await send_telegram_otp(telegram_bot_token, telegram_chat_id, otp, telegram_username)
        if not sent:
            print(f"[DEMO MODE] OTP for {telegram_username}: {otp}")
    else:
        # Demo mode - print to console
        print(f"[DEMO MODE] OTP for {telegram_username}: {otp}")
    
    return {
        "message": "If you're a registered admin, you'll receive an OTP on Telegram.",
        "demo_hint": f"Check console for OTP (demo mode). OTP: {otp}" if not telegram_bot_token else None
    }


@router.post("/verify-otp")
async def verify_otp(
    request: OTPVerify,
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP and return JWT token for admin."""
    telegram_username = request.telegram_username.lower().strip().lstrip('@')
    
    # Check stored OTP
    stored = otp_store.get(telegram_username)
    
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP requested or OTP expired")
    
    # Check expiry
    if datetime.utcnow() > stored["expiry"]:
        del otp_store[telegram_username]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_store[telegram_username]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if request.otp != stored["otp"]:
        otp_store[telegram_username]["attempts"] += 1
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Get admin user
    result = await db.execute(
        select(User).where(User.username == telegram_username)
    )
    admin = result.scalars().first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Clear OTP
    del otp_store[telegram_username]
    
    # Create JWT token
    token = create_admin_token({
        "sub": admin.username,
        "user_id": admin.id,
        "role": "admin"
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "username": admin.username,
            "full_name": admin.full_name,
            "email": admin.email
        }
    }


@router.get("/me")
async def get_current_admin(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get current admin user from token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(status_code=401, detail="Not an admin token")
        username = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(
        select(User).where(User.username == username)
    )
    admin = result.scalars().first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {
        "id": admin.id,
        "username": admin.username,
        "full_name": admin.full_name,
        "email": admin.email
    }
