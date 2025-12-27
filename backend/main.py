# main.py
from database.mongodb import connect_to_mongo, close_mongo_connection
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from auth.deps import get_current_user
from schemas.user import UserResponse
from config import settings
from routes import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    print("🚀 Application starting up...")
    yield
    # Shutdown
    await close_mongo_connection()
    print("🛑 Application shutting down...")

app = FastAPI(
    title=settings.project_name,
    lifespan=lifespan,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    swagger_ui_parameters={"persistAuthorization": True}
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True, # Required for your current auth flow
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.api_v1_prefix)

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI Authentication API", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

@app.get(f"{settings.api_v1_prefix}/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    if "_id" in current_user:
        current_user["id"] = str(current_user["_id"])
        current_user.pop("hashed_password", None)
    
    return current_user