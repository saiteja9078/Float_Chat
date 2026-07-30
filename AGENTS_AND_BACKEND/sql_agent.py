import json
import psycopg2
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash",api_key = "AIzaSyDs4p3zkmS0CQMUpBy_TAanFN0vMYDnJYA")
sql_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are assigned to write SQL queries based on the user's natural language and filters provided.\n"
            "You are given float_ids grouped into filter categories. Always restrict queries to those float_ids.\n"
            "The SQL table structure is:\n"
            """CREATE TABLE IF NOT EXISTS argo_profiles (
    id SERIAL PRIMARY KEY,
    float_id VARCHAR(20) NOT NULL,
    cycle_number INT NOT NULL,
    juld TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pressure REAL[],
    pressure_qc TEXT[],
    pressure_adjusted REAL[],
    pressure_adjusted_qc TEXT[],
    pressure_adjusted_error REAL[],
    temperature REAL[],
    temperature_qc TEXT[],
    temperature_adjusted REAL[],
    temperature_adjusted_qc TEXT[],
    temperature_adjusted_error REAL[],
    salinity REAL[],
    salinity_qc TEXT[],
    salinity_adjusted REAL[],
    salinity_adjusted_qc TEXT[],
    salinity_adjusted_error REAL[],
    doxy REAL[],
    doxy_qc TEXT[],
    doxy_adjusted REAL[],
    doxy_adjusted_qc TEXT[],
    doxy_adjusted_error REAL[],
    chla REAL[],
    chla_qc TEXT[],
    chla_adjusted REAL[],
    chla_adjusted_qc TEXT[],
    chla_adjusted_error REAL[],
    bbp700 REAL[],
    bbp700_qc TEXT[],
    bbp700_adjusted REAL[],
    bbp700_adjusted_qc TEXT[],
    bbp700_adjusted_error REAL[],
    chla_fluorescence REAL[],
    chla_fluorescence_qc TEXT[],
    chla_fluorescence_adjusted REAL[],
    chla_fluorescence_adjusted_qc TEXT[],
    chla_fluorescence_adjusted_error REAL[]
);"""
            "Requirements:\n"
            "- Always include latitude, longitude, juld, cycle_number, float_id in the query.\n"
            "- Restrict results to only the float_ids provided.\n"
            "- Output *only* the SQL query, no explanation, no markdown.\n"
            "- Pressure is same as depth so if user asks about depth find for depth."
        ),
        (
            "human",
            "query: {query}\n"
            "filter: {filter}"
        ),
    ]
)

# --- DB Connection ---
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="argo_db",
    user="argo_user",
    password="argo_pass"
)
cur = conn.cursor()
import math
from collections import defaultdict

def clean_value(val):
    if isinstance(val, float) and math.isnan(val):
        return None  # converts NaN to JSON null
    if isinstance(val, list):
        return [clean_value(v) for v in val]
    return val

BASE_KEYS = {"float_id", "cycle_number", "juld", "latitude", "longitude"}


def extract_numeric_values(sequence):
    numeric_values = []
    if not isinstance(sequence, list):
        return numeric_values

    for item in sequence:
        if isinstance(item, (int, float)) and not math.isnan(item):
            numeric_values.append(float(item))
    return numeric_values


def build_float_summary(cycles_dict):
    aggregates = defaultdict(list)
    for cycle_payload in cycles_dict.values():
        for key, value in cycle_payload.items():
            if key in BASE_KEYS:
                continue
            numeric_values = extract_numeric_values(value)
            if numeric_values:
                aggregates[key].extend(numeric_values)

    summary = {}
    for key, values in aggregates.items():
        if not values:
            continue
        summary[key] = {
            "mean": sum(values) / len(values),
            "samples": len(values)
        }
    return summary


def format_json(rows, filter_out):
    grouped = {group: {} for group in filter_out.keys()}
    float_to_group = {}

    for group, ids in filter_out.items():
        for fid in ids:
            float_to_group[str(fid)] = group
    for row in rows:
        fid = str(row["float_id"])
        group = float_to_group.get(fid)
        if not group:
            continue

        cycle = row["cycle_number"]
        if fid not in grouped[group]:
            grouped[group][fid] = {"cycles": {}}
        grouped[group][fid]["cycles"][cycle] = {
            "juld": str(row["juld"]),
            "latitude": row["latitude"],
            "longitude": row["longitude"],
        }
        for col, val in row.items():
            if col not in {"float_id", "cycle_number", "juld", "latitude", "longitude"}:
                grouped[group][fid]["cycles"][cycle][col] = clean_value(val)

    # attach summaries so downstream agents/UI can surface aggregate context
    for group, floats in grouped.items():
        for fid, payload in floats.items():
            cycles = payload.get("cycles", {})
            payload["summary"] = build_float_summary(cycles) if cycles else {}

    return grouped




def run_agent(user_query: str, filter_out: dict):
    # 1. Ask LLM to generate SQL
    prompt_str = sql_prompt.format(
        query=user_query,
        filter=json.dumps(filter_out)
    )
    sql_query = llm.invoke(prompt_str).content.strip()

    print("📝 Generated SQL:\n", sql_query)


    cur.execute(sql_query)
    colnames = [desc[0] for desc in cur.description]
    rows = [dict(zip(colnames, r)) for r in cur.fetchall()]


    structured = format_json(rows, filter_out)
    return structured

