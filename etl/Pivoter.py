import pandas as pd

# Load the CSV file
df = pd.read_csv(r'data\weg_products_final.csv')

# Drop duplicate rows based on Product URL
df = df.drop_duplicates(subset=["Product URL"])

# Pivot safely using pivot_table
df_pivoted = df.pivot_table(
    index="Product URL",
    columns="Feature",
    values="Value",
    aggfunc="first"   # choose aggregation depending on your data
)

# Reset index if you want Product URL as a column
df_pivoted.reset_index(inplace=True)

# Save to a new CSV
df_pivoted.to_csv("grouped_products.csv", index=False)
