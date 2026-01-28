"""
Telegram Bot Webhook for Admin Registration.
Handles /start command to register new admins.
"""

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import httpx

from ..database import settings, async_session
from ..models import User, UserRole

router = APIRouter(
    prefix="/telegram",
    tags=["telegram-bot"],
)

BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[dict] = None


async def send_message(chat_id: int, text: str, parse_mode: str = "Markdown"):
    """Send a message via Telegram bot."""
    if not BOT_TOKEN:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode
                }
            )
            return True
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")
        return False


@router.post("/webhook")
async def telegram_webhook(request: Request):
    """
    Handle incoming Telegram updates.
    Register new admins when they send /start.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    message = data.get("message", {})
    if not message:
        return {"ok": True}
    
    chat = message.get("chat", {})
    user = message.get("from", {})
    text = message.get("text", "")
    
    chat_id = chat.get("id")
    username = user.get("username", "").lower()
    first_name = user.get("first_name", "")
    
    if not chat_id:
        return {"ok": True}
    
    # Handle /start command
    if text.startswith("/start"):
        if not username:
            await send_message(
                chat_id,
                "❌ *Registration Failed*\n\n"
                "You need a Telegram username to register as an admin.\n"
                "Please set a username in Telegram settings and try again."
            )
            return {"ok": True}
        
        async with async_session() as db:
            # Check if already registered
            result = await db.execute(
                select(User).where(User.telegram_chat_id == str(chat_id))
            )
            existing = result.scalars().first()
            
            if existing:
                await send_message(
                    chat_id,
                    f"👋 *Welcome back, {existing.full_name}!*\n\n"
                    f"You're already registered as *{existing.role}*.\n\n"
                    f"To login, go to the Admin Portal:\n"
                    f"🔗 http://localhost:8081\n\n"
                    f"Enter your username: `@{existing.username}`"
                )
                return {"ok": True}
            
            # Check if username already taken
            result = await db.execute(
                select(User).where(User.username == username)
            )
            username_taken = result.scalars().first()
            
            if username_taken:
                # Update chat_id for existing user
                username_taken.telegram_chat_id = str(chat_id)
                await db.commit()
                await send_message(
                    chat_id,
                    f"✅ *Account Linked!*\n\n"
                    f"Your Telegram is now linked to admin account `@{username}`.\n\n"
                    f"To login, go to:\n"
                    f"🔗 http://localhost:8081"
                )
                return {"ok": True}
            
            # Create new admin
            new_admin = User(
                username=username,
                full_name=first_name or username,
                telegram_chat_id=str(chat_id),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(new_admin)
            await db.commit()
            
            await send_message(
                chat_id,
                f"🎉 *Registration Successful!*\n\n"
                f"Welcome to *SentinelX Admin Portal*, {first_name}!\n\n"
                f"━━━━━━━━━━━━━━━━\n"
                f"👤 *Username:* `@{username}`\n"
                f"🔑 *Role:* Admin\n"
                f"━━━━━━━━━━━━━━━━\n\n"
                f"*How to Login:*\n"
                f"1️⃣ Go to: http://localhost:8081\n"
                f"2️⃣ Enter your username: `{username}`\n"
                f"3️⃣ You'll receive an OTP here\n"
                f"4️⃣ Enter the OTP to access the portal\n\n"
                f"🔐 Your account is secured with Telegram OTP!"
            )
    
    return {"ok": True}


@router.get("/set-webhook")
async def set_webhook(url: str):
    """Set the webhook URL for the Telegram bot."""
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    webhook_url = f"{url}/telegram/webhook"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook",
            json={"url": webhook_url}
        )
        return response.json()


@router.get("/remove-webhook")
async def remove_webhook():
    """Remove the webhook (for local polling mode)."""
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
        )
        return response.json()
