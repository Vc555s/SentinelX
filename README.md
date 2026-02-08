# 🛡️ SentinelX - SafeCity Platform

<div align="center">

**AI-Powered Crime Prediction & Public Safety Platform**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://typescriptlang.org)

</div>

---

## 📋 Overview

SentinelX is an intelligent urban safety platform that leverages machine learning to predict crime hotspots, optimize patrol routes, and enhance public safety through real-time incident reporting and analysis.

### ✨ Key Features

- 🗺️ **Crime Hotspot Mapping** - Real-time visualization of crime-prone areas
- 🔮 **Predictive Analytics** - ML-powered forecasting of potential incidents
- 👮 **Patrol Optimization** - AI-suggested patrol routes for law enforcement
- 📱 **Multi-Portal System** - Separate portals for admins, patrol officers, and citizens
- 🚨 **SOS Integration** - Emergency alert system with location tracking
- 🔐 **Secure Authentication** - Google OAuth & Telegram OTP for admin access

---

## 🏗️ Project Structure

```
SentinelX/
├── backend/                 # FastAPI backend server
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── models.py       # Database models
│   │   └── main.py         # Application entry
│   └── .env.example        # Environment template
├── frontend/
│   ├── admin-portal/       # Admin dashboard (React + TypeScript)
│   ├── patrol-vue-main/    # Patrol officer portal
│   └── landing/            # Public landing page
├── ml_engine/              # Machine learning pipelines
│   ├── src/                # Training & prediction scripts
│   ├── models/             # Saved model artifacts
│   └── data/               # Training data
├── start-all.sh            # Launch all services
└── requirements.txt        # Python dependencies
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Admin Portal
cd frontend/admin-portal
npm install
npm run dev  # Runs on http://localhost:8081

# Patrol Portal
cd frontend/patrol-vue-main
npm install
npm run dev  # Runs on http://localhost:8080
```

### Quick Launch (All Services)

```bash
./start-all.sh
```

---

## 🔧 Configuration

Create a `.env` file in the `backend/` directory using `.env.example` as a template:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Database connection string |
| `SECRET_KEY` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for admin OTP |

---

## 🤖 ML Engine

The machine learning engine provides:

- **Hotspot Detection** - DBSCAN/K-Means clustering for crime area identification
- **Time-Series Forecasting** - Trend prediction using ensemble models
- **Resource Optimization** - Patrol route suggestions

See [ml_engine/README.md](ml_engine/README.md) for detailed documentation.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">
  <sub>Built with ❤️ for safer cities</sub>
</div>
