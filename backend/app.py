from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import time

from config import settings
from routes import products, users
from database import engine, Base
# Import other models as needed

app = FastAPI(
    title="InduMine Modular Backend",
    debug=settings.DEBUG,
    openapi_url="/api/v1/openapi.json" if settings.ENVIRONMENT == "development" else None,
    docs_url="/api/v1/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None
)

# 1. Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "indumine.duckdns.org",
        "api-indumine.duckdns.org",
        "localhost",
        "127.0.0.1"
    ] if settings.ENVIRONMENT == "production" else ["*"]
)

# 2. CORS Middleware (Must be defined BEFORE the custom http middleware for best results)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600
)

# 3. Consolidated Custom Middleware
# We combine timing and security headers into ONE function to avoid header conflicts
@app.middleware("http")
async def unified_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Process Time
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Security Headers (Only add if not already present)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    
    # Remove server header
    if "server" in response.headers:
        del response.headers["server"]
        
    return response

# Register routes
app.include_router(products.router)
app.include_router(users.router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

# List all available routes
@app.get("/routes")
async def list_routes():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": route.methods if hasattr(route, "methods") else ["WS"],
            "name": route.name if hasattr(route, "name") else "N/A"
        })
    return routes

if __name__ == "__main__":
    import uvicorn
    
    # Create tables on startup
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
    
    print("\n" + "="*50)
    print("Available routes:")
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"{', '.join(route.methods):<20} {route.path}")
    print("="*50 + "\n")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
        server_header=False
    )