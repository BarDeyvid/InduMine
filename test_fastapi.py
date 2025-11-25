from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote 
import pandas as pd
app = FastAPI()

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

df = pd.read_csv(r"data\grouped_products_final.csv") 

df["first_search"] = df["Product URL"].str.split("en/", n=1).str[1]
df["second_search"] = df["first_search"].str.split("/", n=0).str[0]
df["third_search"] = df["second_search"].apply(lambda x: unquote(x) if isinstance(x, str) else x)
df["fourth_search"] = df["third_search"].drop_duplicates()
df["final_search"] = df["fourth_search"].str.replace("-", " ")

data_series = df["final_search"].str.split("/", n=0).str[0] 

product_list = data_series.dropna().tolist()

# Example endpoint
@app.get("/items")
def get_items():
    return product_list