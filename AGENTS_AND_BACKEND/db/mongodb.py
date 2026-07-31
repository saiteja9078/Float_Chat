from pymongo import MongoClient
import json
from datetime import datetime

# ---------------------------------------------------------
# CLEAN VALUE (keeps b'...') + FULL DATETIME CONVERSION
# ---------------------------------------------------------
def clean_value(value):
    # 1️⃣ CASE: Normal datetime format "YYYY-MM-DD HH:MM:SS"
    if isinstance(value, str):
        try:
            return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        except:
            pass

        # 2️⃣ CASE: Argo float format inside b'YYYYMMDDHHMMSS'
        # Example: b'20021102020000'
        if value.startswith("b'") and value.endswith("'"):
            inner = value[2:-1].strip()  # remove b' and '

            # Check if it's a datetime of format YYYYMMDDHHMMSS
            if inner.isdigit() and len(inner) == 14:
                try:
                    return datetime.strptime(inner, "%Y%m%d%H%M%S")
                except:
                    pass

            # Otherwise treat as a normal b'...' string after cleaning
            return f"b'{inner}'"

        # 3️⃣ Normal strings → strip spaces
        return value.strip()

    # 4️⃣ Nested dict → clean recursively
    elif isinstance(value, dict):
        return {k: clean_value(v) for k, v in value.items()}

    # 5️⃣ List → clean each element
    elif isinstance(value, list):
        return [clean_value(v) for v in value]

    # 6️⃣ Other values unchanged
    return value


# ---------------------------------------------------------
# CONNECT TO MONGODB
# ---------------------------------------------------------
client = MongoClient("mongodb://localhost:27017/")
db = client["argo_database"]
collection = db["argo_floats"]

import os

# ---------------------------------------------------------
# LOAD JSON FILE
# ---------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.abspath(os.path.join(current_dir, "..", "data", "meta_data.json"))

with open(json_path, "r") as f:
    raw_data = json.load(f)

# ---------------------------------------------------------
# CLEAN & PREPARE DOCUMENTS
# ---------------------------------------------------------
documents = []

for key, value in raw_data.items():
    cleaned = clean_value(value)     # apply full cleaning + datetime conversion
    cleaned["_id"] = key             # use platform number as document ID
    cleaned["platform_id"] = key     # optional
    documents.append(cleaned)

# ---------------------------------------------------------
# INSERT INTO MONGODB (UPSERT)
# ---------------------------------------------------------
for doc in documents:
    collection.replace_one({"_id": doc["_id"]}, doc, upsert=True)

print("Inserted/Updated:", len(documents), "documents")


# ---------------------------------------------------------
# TEST: QUERY BACK THE DATE FIELDS
# ---------------------------------------------------------
sample = collection.find_one()

print("\nTesting date conversion:")
print("Stored 'last_updated':", sample.get("last_updated"))
print("Type:", type(sample.get("last_updated")))

launch_date = sample.get("launch_info", {}).get("date")
print("\nStored 'launch_info.date':", launch_date)
print("Type:", type(launch_date))


# ---------------------------------------------------------
# SAMPLE QUERIES
# ---------------------------------------------------------
print("\nFind one float in Indian Ocean:")
result = collection.find_one({"location": "Indian Ocean"})
print(result if result else "None found")

print("\nFind floats updated after 2024-01-01:")
after_2024 = list(collection.find({"last_updated": {"$gt": datetime(2024, 1, 1)}}))
print("Count:", len(after_2024))

print("\nFind floats launched after year 2010:")
after_2010 = list(collection.find({"launch_info.date": {"$gt": datetime(2010, 1, 1)}}))
print("Count:", len(after_2010))


# ---------------------------------------------------------
# SHOW COLLECTION NAMES
# ---------------------------------------------------------

print(db.list_collection_names())

three_docs = list(collection.find().limit(3))

output_path = "schema.txt"

# Convert datetime objects → strings for JSON



with open(output_path, "w") as f:
    f.write(str(three_docs))

print("\nSaved 3 sample documents to:", output_path)