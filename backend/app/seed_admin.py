"""
Seed script to create an admin user for testing.
Run with: python -m app.seed_admin
"""

import asyncio
from sqlalchemy import select
from app.database import async_session, engine, Base
from app.models import User, UserRole

async def seed_admin():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as db:
        # Check if admin already exists
        result = await db.execute(
            select(User).where(User.username == "codedefender777")
        )
        existing = result.scalars().first()
        
        if existing:
            print(f"Admin user already exists: {existing.username}")
            # Update chat_id if needed
            if not existing.telegram_chat_id:
                existing.telegram_chat_id = "1349460652"
                await db.commit()
                print("Updated telegram_chat_id")
            return
        
        # Create admin user
        admin = User(
            username="codedefender777",
            email="admin@sentinelx.local",
            full_name="Admin User",
            telegram_chat_id="1349460652",
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin)
        await db.commit()
        print(f"Created admin user: codedefender777")
        print(f"Telegram Chat ID: 1349460652")

if __name__ == "__main__":
    asyncio.run(seed_admin())
