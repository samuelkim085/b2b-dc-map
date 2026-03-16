"""
Generates zip-centroids.json from the ZIP codes in shipments.csv.
Requires: pip install pgeocode pandas
Run once: python scripts/generate_zip_centroids.py
"""
import json
import pandas as pd
import pgeocode

df = pd.read_csv("public/data/shipments.csv")

# Extract US ZIP codes only (5 digits)
us_rows = df[df["dest_ctry"] == "US"].copy()
us_rows["dest_zip"] = us_rows["dest_zip"].astype(str).str.zfill(5)
zips = us_rows["dest_zip"].unique().tolist()

nomi = pgeocode.Nominatim("US")
results = nomi.query_postal_code(zips)

centroids = {}
for i, row in results.iterrows():
    z = str(zips[i]).zfill(5)
    if pd.notna(row["latitude"]) and pd.notna(row["longitude"]):
        centroids[z] = {"lat": round(row["latitude"], 4), "lon": round(row["longitude"], 4)}

with open("src/data/zip-centroids.json", "w") as f:
    json.dump(centroids, f, indent=2)

print(f"Generated {len(centroids)} ZIP centroids")
