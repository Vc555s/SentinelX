"""
Google OAuth2 authentication router for User Portal.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
import httpx

from .. import schemas, models, database
from ..database import settings
from jose import JWTError, jwt

router = APIRouter(
    prefix="/auth/google",
    tags=["google-auth"],
)

# Google OAuth Config from settings
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID or ""
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET or ""
GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI

# JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.get("/login")
async def google_login():
    """Redirect to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID.")
    
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/callback")
async def google_callback(
    code: str,
    db: AsyncSession = Depends(database.get_db)
):
    """Handle Google OAuth callback and create/login user."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured.")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        # Get user info
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        userinfo = userinfo_response.json()
    
    # Check if user exists
    result = await db.execute(
        select(models.GoogleUser).where(models.GoogleUser.google_id == userinfo["id"])
    )
    user = result.scalars().first()
    
    if not user:
        # Create new user
        user = models.GoogleUser(
            email=userinfo["email"],
            google_id=userinfo["id"],
            full_name=userinfo.get("name", ""),
            profile_picture=userinfo.get("picture", "")
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Create JWT token
    jwt_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    
    # Redirect to frontend with token
    frontend_url = settings.USER_FRONTEND_URL
    return RedirectResponse(url=f"{frontend_url}?token={jwt_token}")


@router.get("/me")
async def get_current_google_user(
    token: str,
    db: AsyncSession = Depends(database.get_db)
):
    """Get current user info from JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(
        select(models.GoogleUser).where(models.GoogleUser.email == email)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "profile_picture": user.profile_picture
    }
