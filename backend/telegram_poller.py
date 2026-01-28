#!/usr/bin/env python3
"""
Telegram Bot Polling Script for Local Development.
Polls for updates and processes /start commands for admin registration.

Run with: python telegram_poller.py
"""

import asyncio
import httpx
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_URL = "http://localhost:8000"

if not BOT_TOKEN:
    print("Error: TELEGRAM_BOT_TOKEN not set in .env")
    sys.exit(1)


async def get_updates(offset: int = 0):
    """Get updates from Telegram."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates",
                params={"offset": offset, "timeout": 20}
            )
            return response.json()
        except Exception as e:
            print(f"Error getting updates: {e}")
            return {"ok": False, "result": []}


async def process_update(update: dict):
    """Forward update to our webhook endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_URL}/telegram/webhook",
                json=update
            )
            if response.status_code == 200:
                print(f"✓ Processed update {update.get('update_id')}")
            else:
                print(f"✗ Failed to process update: {response.text}")
        except Exception as e:
            print(f"✗ Error processing update: {e}")


async def main():
    print("🤖 SentinelX Telegram Bot Poller Started")
    print(f"   Listening for /start commands...")
    print(f"   Press Ctrl+C to stop\n")
    
    offset = 0
    
    while True:
        try:
            data = await get_updates(offset)
            
            if data.get("ok") and data.get("result"):
                for update in data["result"]:
                    await process_update(update)
                    offset = update["update_id"] + 1
            
            await asyncio.sleep(1)
            
        except KeyboardInterrupt:
            print("\n👋 Bot poller stopped")
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
