#!/bin/bash

# Setup Backend
echo "Setting up Backend Environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "Backend setup complete."

# Setup ML Engine
# (Might share the same venv or have its own, for now keeping it simple)

echo "Please create a .env file in backend/ with your database credentials."
