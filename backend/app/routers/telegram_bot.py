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
        # Extract phone number if provided with /start command
        # Format: /start +919876543210
        parts = text.split()
        provided_phone = parts[1] if len(parts) > 1 else None
        
        # Normalize phone number if provided
        if provided_phone:
            provided_phone = provided_phone.strip().replace(" ", "").replace("-", "")
            if not provided_phone.startswith("+"):
                provided_phone = "+" + provided_phone
        
        async with async_session() as db:
            # Check if already registered by chat_id
            result = await db.execute(
                select(User).where(User.telegram_chat_id == str(chat_id))
            )
            existing = result.scalars().first()
            
            if existing:
                login_method = f"username: `@{existing.username}`" if existing.username else f"phone: `{existing.phone_number}`"
                await send_message(
                    chat_id,
                    f"👋 *Welcome back, {existing.full_name}!*\n\n"
                    f"You're already registered as *{existing.role}*.\n\n"
                    f"To login, go to the Admin Portal:\n"
                    f"🔗 http://localhost:8081\n\n"
                    f"Use your {login_method}"
                )
                return {"ok": True}
            
            # Check if username exists and link it
            if username:
                result = await db.execute(
                    select(User).where(User.username == username)
                )
                username_user = result.scalars().first()
                
                if username_user:
                    username_user.telegram_chat_id = str(chat_id)
                    await db.commit()
                    await send_message(
                        chat_id,
                        f"✅ *Account Linked!*\n\n"
                        f"Your Telegram is now linked to admin account `@{username}`.\n\n"
                        f"To login, go to:\n"
                        f"🔗 http://localhost:8081"
                    )
                    return {"ok": True}
            
            # Check if phone number provided and link it
            if provided_phone:
                result = await db.execute(
                    select(User).where(User.phone_number == provided_phone)
                )
                phone_user = result.scalars().first()
                
                if phone_user:
                    phone_user.telegram_chat_id = str(chat_id)
                    await db.commit()
                    await send_message(
                        chat_id,
                        f"✅ *Account Linked!*\n\n"
                        f"Your Telegram is now linked to phone `{provided_phone}`.\n\n"
                        f"To login, go to:\n"
                        f"🔗 http://localhost:8081"
                    )
                    return {"ok": True}
            
            # Create new admin - use username OR phone OR generate from chat_id
            identifier = username or provided_phone or f"user_{chat_id}"
            
            new_admin = User(
                username=username if username else None,
                phone_number=provided_phone,
                full_name=first_name or identifier,
                telegram_chat_id=str(chat_id),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(new_admin)
            await db.commit()
            
            # Determine login instructions
            if username:
                login_info = f"*Username:* `@{username}`"
                login_method = f"username: `{username}`"
            elif provided_phone:
                login_info = f"*Phone:* `{provided_phone}`"
                login_method = f"phone number with country code"
            else:
                # No username or phone - prompt to provide phone
                await send_message(
                    chat_id,
                    f"🎉 *Registration Started!*\n\n"
                    f"Welcome {first_name}! Your Telegram is linked.\n\n"
                    f"⚠️ *One more step:*\n"
                    f"You don't have a Telegram username set.\n\n"
                    f"Please reply with your phone number:\n"
                    f"`/phone +919876543210`\n\n"
                    f"This will complete your registration."
                )
                return {"ok": True}
            
            await send_message(
                chat_id,
                f"🎉 *Registration Successful!*\n\n"
                f"Welcome to *SentinelX Admin Portal*, {first_name}!\n\n"
                f"━━━━━━━━━━━━━━━━\n"
                f"👤 {login_info}\n"
                f"🔑 *Role:* Admin\n"
                f"━━━━━━━━━━━━━━━━\n\n"
                f"*How to Login:*\n"
                f"1️⃣ Go to: http://localhost:8081\n"
                f"2️⃣ Enter your {login_method}\n"
                f"3️⃣ You'll receive an OTP here\n"
                f"4️⃣ Enter the OTP to access the portal\n\n"
                f"🔐 Your account is secured with Telegram OTP!"
            )
    
    # Handle /phone command to add phone number
    elif text.startswith("/phone"):
        parts = text.split()
        if len(parts) < 2:
            await send_message(
                chat_id,
                "❌ Please provide your phone number:\n"
                "`/phone +919876543210`"
            )
            return {"ok": True}
        
        phone = parts[1].strip().replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            phone = "+" + phone
        
        async with async_session() as db:
            result = await db.execute(
                select(User).where(User.telegram_chat_id == str(chat_id))
            )
            user = result.scalars().first()
            
            if user:
                user.phone_number = phone
                await db.commit()
                await send_message(
                    chat_id,
                    f"✅ *Phone Added!*\n\n"
                    f"Your phone `{phone}` is now linked.\n\n"
                    f"You can now login at:\n"
                    f"🔗 http://localhost:8081\n\n"
                    f"Use the *Phone* tab and enter your number."
                )
            else:
                await send_message(
                    chat_id,
                    "❌ Please send /start first to register."
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
