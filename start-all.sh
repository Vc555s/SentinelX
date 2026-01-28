#!/bin/bash
# SentinelX - Start All Services
# This script starts all components of the SentinelX platform

echo "🛡️ Starting SentinelX SafeCity Platform..."
echo "============================================"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start Backend (Port 8000)
echo ""
echo "📡 Starting Backend API on port 8000..."
cd "$SCRIPT_DIR"
./start-backend.sh &
BACKEND_PID=$!
sleep 3

# Start User Portal (Port 8080)
echo ""
echo "👤 Starting User Portal on port 8080..."
cd "$SCRIPT_DIR"
./start-frontend.sh &
USER_PID=$!
sleep 2

# Start Admin Portal (Port 8081)
echo ""
echo "👮 Starting Admin Portal on port 8081..."
cd "$SCRIPT_DIR"
./start-admin.sh &
ADMIN_PID=$!
sleep 2

# Start Landing Page (Port 3000)
echo ""
echo "🏠 Starting Landing Page on port 3000..."
cd "$SCRIPT_DIR"
./start-landing.sh &
LANDING_PID=$!

echo ""
echo "============================================"
echo "✅ SentinelX Platform Started!"
echo ""
echo "🔗 Access URLs:"
echo "   Landing Page:  http://localhost:3000"
echo "   User Portal:   http://localhost:8080"
echo "   Admin Portal:  http://localhost:8081"
echo "   Backend API:   http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================"

# Wait for any process to exit
wait
