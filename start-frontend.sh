#!/bin/bash
# Start SentinelX Frontend

# Kill any process running on port 8080
echo "Checking for existing processes on port 8080..."
lsof -ti:8080 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 8080" || echo "Port 8080 is free"

cd "$(dirname "$0")/frontend/patrol-vue-main"

echo "Starting frontend on port 8080..."
npm run dev
