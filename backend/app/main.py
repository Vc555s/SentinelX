from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, auth_google, auth_telegram, telegram_bot, incidents, analytics, patrols, dashboard, predictions
from .database import engine, Base

app = FastAPI(
    title="SentinelX SafeCity API",
    description="API for Crime Mapping & Predictive Policing Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth.router)
app.include_router(auth_google.router)
app.include_router(auth_telegram.router)
app.include_router(telegram_bot.router)
app.include_router(incidents.router)
app.include_router(analytics.router)
app.include_router(patrols.router)
app.include_router(dashboard.router)
app.include_router(predictions.router)

@app.get("/")
async def root():
    return {"message": "Welcome to SentinelX SafeCity API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

