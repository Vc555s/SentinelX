#!/bin/bash
# Start SentinelX Landing Page

# Kill any process running on port 3000
echo "Checking for existing processes on port 3000..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 3000" || echo "Port 3000 is free"

cd "$(dirname "$0")/frontend/landing"

echo "Starting Landing Page on port 3000..."
python3 -m http.server 3000
