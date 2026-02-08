#!/bin/bash
# Start SentinelX Backend

# Kill any process running on port 8000
echo "Checking for existing processes on port 8000..."
lsof -ti:8000 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 8000" || echo "Port 8000 is free"

cd "$(dirname "$0")/backend"
if [ -f "../venv/bin/activate" ]; then
    source ../venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

echo "Starting backend on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2

echo "Starting Telegram bot poller..."
python telegram_poller.py &
POLLER_PID=$!

# Wait for either to exit
wait $BACKEND_PID $POLLER_PID
