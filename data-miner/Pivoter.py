import pandas as pd

# Load the CSV file
df = pd.read_csv('weg_products_recursive.csv')  # Replace with your actual file path
# Pivot the table: rows = Product URL, columns = Feature, values = Value
df_pivoted = df.pivot(index='Product URL', columns='Feature', values='Value')

# Optional: reset index if you want 'Product URL' as a column
df_pivoted.reset_index(inplace=True)

# Save to a new CSV
df_pivoted.to_csv('grouped_products.csv', index=False)
