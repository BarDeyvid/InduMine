from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.products import router

app = FastAPI(title="InduMine Modular Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    from database import Base, engine
    # Initial DB Create (safe to run, will only create tables if missing)
    Base.metadata.create_all(bind=engine)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

from configuration.products import *
from models.products import *
from models.users import *
from schemas.products import *
from utils.helpers import *

# ============================================================================
# CONFIGURATION
# ============================================================================


# ============================================================================
# MODELS (Database Tables)
# ============================================================================



# ============================================================================
# CATEGORY MAPPING CONFIGURATION
# ============================================================================
# This defines the "Universe" of data. We ignore the 'categories' table in SQL
# and use this strict mapping to determine which Python Class handles which Data.

# ============================================================================
# PYDANTIC SCHEMAS (Validation)
# ============================================================================

# ============================================================================
# HELPERS & DEPENDENCIES
# ============================================================================

