#!/bin/bash
# Start SentinelX Admin Portal

# Kill any process running on port 8081
echo "Checking for existing processes on port 8081..."
lsof -ti:8081 | xargs -r kill -9 2>/dev/null && echo "Killed existing process on port 8081" || echo "Port 8081 is free"

cd "$(dirname "$0")/frontend/admin-portal"

echo "Starting Admin Portal on port 8081..."
npm run dev
