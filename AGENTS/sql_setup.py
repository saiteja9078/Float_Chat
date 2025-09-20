import os, re
import psycopg2
import xarray as xr
import numpy as np

# --- DB connection ---
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="argo_db",
    user="argo_user",
    password="argo_pass"
)
cur = conn.cursor()

# Create unified table
cur.execute("""
CREATE TABLE IF NOT EXISTS argo_profiles (
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
);
""")
conn.commit()

def parse_filename(fname):
    m = re.match(r"[BSD]?D?(\d+)_(\d+)\.nc", fname)
    return (m.group(1), int(m.group(2))) if m else (None, None)

def safe(ds, var):
    if var in ds:
        arr = ds[var].values
        return arr.flatten().astype(float).tolist() if np.issubdtype(arr.dtype, np.number) else arr.astype(str).flatten().tolist()
    return None

def process_nc(filepath):
    ds = xr.open_dataset(filepath)
    fname = os.path.basename(filepath)

    # Drop unnecessary dimensions
    if fname.startswith("BD") or fname.startswith("D"):
        if "N_HISTORY" in ds.dims: ds = ds.drop_dims("N_HISTORY")
    if fname.startswith(("BD","D","SD")):
        if "N_PARAM" in ds.dims: ds = ds.drop_dims("N_PARAM")

    float_id, cycle = parse_filename(fname)

    juld = str(ds["JULD"].values[0]) if "JULD" in ds else None
    lat = float(ds["LATITUDE"].values[0]) if "LATITUDE" in ds else None
    lon = float(ds["LONGITUDE"].values[0]) if "LONGITUDE" in ds else None

    return (
        float_id, cycle, juld, lat, lon,
        safe(ds,"PRES"), safe(ds,"PRES_QC"), safe(ds,"PRES_ADJUSTED"), safe(ds,"PRES_ADJUSTED_QC"), safe(ds,"PRES_ADJUSTED_ERROR"),
        safe(ds,"TEMP"), safe(ds,"TEMP_QC"), safe(ds,"TEMP_ADJUSTED"), safe(ds,"TEMP_ADJUSTED_QC"), safe(ds,"TEMP_ADJUSTED_ERROR"),
        safe(ds,"PSAL"), safe(ds,"PSAL_QC"), safe(ds,"PSAL_ADJUSTED"), safe(ds,"PSAL_ADJUSTED_QC"), safe(ds,"PSAL_ADJUSTED_ERROR"),
        safe(ds,"DOXY"), safe(ds,"DOXY_QC"), safe(ds,"DOXY_ADJUSTED"), safe(ds,"DOXY_ADJUSTED_QC"), safe(ds,"DOXY_ADJUSTED_ERROR"),
        safe(ds,"CHLA"), safe(ds,"CHLA_QC"), safe(ds,"CHLA_ADJUSTED"), safe(ds,"CHLA_ADJUSTED_QC"), safe(ds,"CHLA_ADJUSTED_ERROR"),
        safe(ds,"BBP700"), safe(ds,"BBP700_QC"), safe(ds,"BBP700_ADJUSTED"), safe(ds,"BBP700_ADJUSTED_QC"), safe(ds,"BBP700_ADJUSTED_ERROR"),
        safe(ds,"CHLA_FLUORESCENCE"), safe(ds,"CHLA_FLUORESCENCE_QC"), safe(ds,"CHLA_FLUORESCENCE_ADJUSTED"),
        safe(ds,"CHLA_FLUORESCENCE_ADJUSTED_QC"), safe(ds,"CHLA_FLUORESCENCE_ADJUSTED_ERROR")
    )

DATASET_PATH = "/Users/joyboy/Downloads/example/dataset"

for root, _, files in os.walk(DATASET_PATH):
    for fname in files:
        if fname.endswith(".nc") and (fname.startswith("D") or fname.startswith("BD") or fname.startswith("SD")):
            row = process_nc(os.path.join(root, fname))
            cur.execute("""
                INSERT INTO argo_profiles (
                    float_id, cycle_number, juld, latitude, longitude,
                    pressure, pressure_qc, pressure_adjusted, pressure_adjusted_qc, pressure_adjusted_error,
                    temperature, temperature_qc, temperature_adjusted, temperature_adjusted_qc, temperature_adjusted_error,
                    salinity, salinity_qc, salinity_adjusted, salinity_adjusted_qc, salinity_adjusted_error,
                    doxy, doxy_qc, doxy_adjusted, doxy_adjusted_qc, doxy_adjusted_error,
                    chla, chla_qc, chla_adjusted, chla_adjusted_qc, chla_adjusted_error,
                    bbp700, bbp700_qc, bbp700_adjusted, bbp700_adjusted_qc, bbp700_adjusted_error,
                    chla_fluorescence, chla_fluorescence_qc, chla_fluorescence_adjusted,
                    chla_fluorescence_adjusted_qc, chla_fluorescence_adjusted_error
                ) VALUES (%s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s,
                          %s,%s,%s,%s,%s);
            """, row)
            conn.commit()
            print(f"✅ Inserted {fname}")

cur.close()
conn.close()
