from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Example endpoint
@app.get("/items")
def get_items():
    return [
        {"id": 1, "name": "Apple"},
        {"id": 2, "name": "Banana"},
        {"id": 3, "name": "Cherry"}
    ]
