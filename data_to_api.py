import pandas as pd
from urllib.parse import unquote

df = pd.read_csv(r"data\grouped_products_final.csv")

df["first_search"] = df["Product URL"].str.split("en/", n=1).str[1]
df["second_search"] = df["first_search"].str.split("/", n=0).str[0]
df["final_search"] = df["second_search"].apply(lambda x: unquote(x) if isinstance(x, str) else x)
print(df["final_search"])
