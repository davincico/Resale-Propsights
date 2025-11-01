import os, io, json
from datetime import datetime

import boto3
import pandas as pd

s3 = boto3.client("s3")

# ---- env ----
DATA_BUCKET  = os.environ["DATA_BUCKET"]         # e.g. karhwee-data-propsights
RAW_PREFIX   = os.environ.get("RAW_PREFIX", "raw/")
RAW_KEY_ENV  = os.environ.get("RAW_KEY")         # optional explicit raw key
CLEAN_KEY    = os.environ.get("CLEAN_KEY", "clean/clean.parquet")
SUMMARY_KEY  = os.environ.get("SUMMARY_KEY", "processed/eda_summary.json")

# ---- helpers ----
def _read_csv(bucket: str, key: str) -> pd.DataFrame:
    obj = s3.get_object(Bucket=bucket, Key=key)
    return pd.read_csv(io.BytesIO(obj["Body"].read()), low_memory=False)

def _write_parquet(df: pd.DataFrame, bucket: str, key: str):
    buf = io.BytesIO()
    df.to_parquet(buf, index=False)
    s3.put_object(
        Bucket=bucket, Key=key, Body=buf.getvalue(),
        ContentType="application/octet-stream", CacheControl="no-store"
    )

def _put_json(bucket: str, key: str, obj: dict):
    s3.put_object(
        Bucket=bucket, Key=key, Body=json.dumps(obj).encode("utf-8"),
        ContentType="application/json", CacheControl="max-age=60"
    )

def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.drop_duplicates()
    for c in df.select_dtypes(include="object"):
        df[c] = df[c].astype(str).str.strip()
    # coerce common numeric fields (optional)
    for c in ("resale_price", "floor_area_sqm"):
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df

def _top_towns(df: pd.DataFrame):
    town_col = None
    for c in df.columns:
        if c.lower() == "town":
            town_col = c; break
    if not town_col:
        return []
    top_df = (df[town_col].dropna().astype(str)
              .value_counts(normalize=True).mul(100).round(2)
              .rename_axis("town").reset_index(name="percent"))
    return top_df.to_dict("records")

def _newest_under_prefix(bucket: str, prefix: str) -> str | None:
    resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    if "Contents" not in resp or not resp["Contents"]:
        return None
    return max(resp["Contents"], key=lambda x: x["LastModified"])["Key"]

# ---- handler ----
def handler(event, context):
    # 1) Decide which raw CSV to read
    raw_key = RAW_KEY_ENV
    if isinstance(event, dict) and "Records" in event:
        # S3 PUT event path
        raw_key = event["Records"][0].get("s3", {}).get("object", {}).get("key", raw_key)
    if not raw_key:
        # fallback: newest under RAW_PREFIX
        raw_key = _newest_under_prefix(DATA_BUCKET, RAW_PREFIX)
    if not raw_key:
        raise ValueError("No RAW_KEY supplied and no object found under RAW_PREFIX.")

    # 2) Read + clean
    df = _read_csv(DATA_BUCKET, raw_key)
    df = _clean(df)

    # 3) Write outputs (same data bucket)
    _write_parquet(df, DATA_BUCKET, CLEAN_KEY)

    summary = {
        "updated_at": datetime.utcnow().isoformat(),
        "source_key": raw_key,
        "n_rows": int(len(df)),
        "town_stats": _top_towns(df),
    }
    _put_json(DATA_BUCKET, SUMMARY_KEY, summary)

    return {
        "status": "ok",
        "rows": len(df),
        "raw_key": raw_key,
        "clean_key": f"s3://{DATA_BUCKET}/{CLEAN_KEY}",
        "summary_key": f"s3://{DATA_BUCKET}/{SUMMARY_KEY}",
    }
