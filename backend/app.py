from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.products import router
from configuration.products import *
from models.products import *
from models.users import *
from schemas.products import *
from utils.helpers import *

app = FastAPI(title="InduMine Modular Backend")  

# --- CORS MIDDLEWARE ---  
origins = [  
    "https://indumine.duckdns.org",  
    "https://api-indumine.duckdns.org", 
    "http://65.109.0.163",  
    "https://65.109.0.163",  
]  

app.add_middleware(  
    CORSMiddleware,  
    allow_origins=origins,  
    allow_credentials=True,  
    allow_methods=["*"],  
    allow_headers=["*"],  
    expose_headers=["*"],  
)

# Include the router
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    from database import Base, engine
    # Initial DB Create (safe to run, will only create tables if missing)
    Base.metadata.create_all(bind=engine)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

