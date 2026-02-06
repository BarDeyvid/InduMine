from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time

from config import settings
from routes import products, users
from database import engine, Base
# Import other models as needed

# Optional: auto-install Argos Translate models on startup
try:
    from argostranslate import package as _argos_package
    from argostranslate import translate as _argos_translate
    _ARGOS_AVAILABLE = True
except Exception:
    _ARGOS_AVAILABLE = False

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

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600
)

# 3. GZip Compression Middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000  # Compress responses larger than 1KB
)

# 4. Consolidated Custom Middleware
@app.middleware("http")
async def unified_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Process Time
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Security Headers
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

async def _ensure_argos_models():
    """Ensure English->Portuguese and English->Spanish Argos models are installed."""
    if not _ARGOS_AVAILABLE:
        print("Argos Translate not available; skipping model installation")
        return

    try:
        installed = _argos_translate.get_installed_languages()
        installed_codes = {getattr(l, 'code', '') for l in installed}
        print(f"Currently installed Argos languages: {installed_codes}")
    except Exception as e:
        print(f"Error checking installed languages: {e}")
        installed_codes = set()

    needed = {"pb", "es"}
    present = set()
    for code in installed_codes:
        if not code:
            continue
        normalized = code.split("_")[0].split("-")[0]
        present.add(normalized)

    missing = needed - present
    if not missing:
        print(f"Argos Translate models already installed: {present}")
        return

    print(f"Missing Argos models: {missing}. Attempting to download...")
    
    try:
        _argos_package.update_package_index()
        available = _argos_package.get_available_packages()

        for pkg in available:
            from_code = getattr(pkg, 'from_code', '')
            to_code = getattr(pkg, 'to_code', '')
            
            if from_code == 'en' and to_code in missing:
                try:
                    print(f"  Downloading and installing Argos package {from_code}->{to_code}...")
                    download_path = pkg.download()
                    _argos_package.install_from_path(download_path)
                    missing.discard(to_code)
                    print(f"  Successfully installed {from_code}->{to_code}")
                    
                    if not missing:
                        break
                except Exception as e:
                    print(f"  Failed to install {from_code}->{to_code}: {e}")

        if missing:
            print(f"Some Argos models are still missing: {missing}")
        else:
            print("Argos Translate models installed successfully")
    except Exception as e:
        print(f"Failed to auto-install Argos models: {e}")

@app.on_event("startup")
async def _on_startup_install_models():
    # Install Argos models on startup
    try:
        await _ensure_argos_models()
    except Exception as e:
        print(f"Error during Argos model installation: {e}")

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