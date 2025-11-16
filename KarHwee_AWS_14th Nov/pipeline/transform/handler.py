# transform/handler.py
import os, io, json
from datetime import datetime
import boto3
import pandas as pd

s3 = boto3.client("s3")

# ---- env (Transform writes back to DATA_BUCKET only) ----
DATA_BUCKET  = os.environ["DATA_BUCKET"]                   # e.g. kh-propsight-data
RAW_PREFIX   = os.environ.get("RAW_PREFIX", "raw/")
RAW_KEY_ENV  = os.environ.get("RAW_KEY")                   # optional explicit raw key
CLEAN_KEY    = os.environ.get("CLEAN_KEY", "clean/clean.parquet")
SUMMARY_KEY  = os.environ.get("SUMMARY_KEY", "processed/eda_summary.json")

def _newest_under_prefix(bucket: str, prefix: str):
    resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    if "Contents" not in resp or not resp["Contents"]:
        return None
    return max(resp["Contents"], key=lambda x: x["LastModified"])["Key"]

def _read_csv_robust(bucket: str, key: str) -> pd.DataFrame:
    obj = s3.get_object(Bucket=bucket, Key=key)
    by = io.BytesIO(obj["Body"].read())
    for enc in ("utf-8", "utf-8-sig", "latin1"):
        by.seek(0)
        try:
            return pd.read_csv(by, encoding=enc, low_memory=False, on_bad_lines="skip")
        except UnicodeDecodeError:
            continue
    by.seek(0)
    return pd.read_csv(by, low_memory=False, on_bad_lines="skip")

def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.drop_duplicates(inplace=True)
    for c in df.select_dtypes(include="object").columns:
        df.loc[:, c] = df[c].astype(str).str.strip()
    for c in ("resale_price", "floor_area_sqm"):
        if c in df.columns:
            df.loc[:, c] = pd.to_numeric(df[c], errors="coerce")
    return df

def _write_parquet(df: pd.DataFrame, bucket: str, key: str):
    buf = io.BytesIO()
    df.to_parquet(buf, index=False, engine="pyarrow", compression="gzip")
    s3.put_object(Bucket=bucket, Key=key, Body=buf.getvalue(),
                  ContentType="application/octet-stream", CacheControl="no-store")

def _put_json(bucket: str, key: str, obj: dict):
    s3.put_object(Bucket=bucket, Key=key,
                  Body=json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
                  ContentType="application/json", CacheControl="max-age=60")

def _top_towns(df: pd.DataFrame):
    town_col = next((c for c in df.columns if c.lower() == "town"), None)
    if not town_col:
        return []
    top_df = (df[town_col].dropna().astype(str)
                .value_counts(normalize=True).mul(100).round(2)
                .rename_axis("town").reset_index(name="percent"))
    return top_df.to_dict("records")

def handler(event, context):
    # choose raw key
    raw_key = RAW_KEY_ENV
    if isinstance(event, dict) and "RAW_KEY" in event:
        raw_key = event["RAW_KEY"] or raw_key
    if isinstance(event, dict) and "Records" in event:
        raw_key = event["Records"][0].get("s3", {}).get("object", {}).get("key", raw_key)
    if not raw_key:
        raw_key = _newest_under_prefix(DATA_BUCKET, RAW_PREFIX)
    if not raw_key:
        raise ValueError("No RAW_KEY supplied and no object found under RAW_PREFIX.")

    # read -> clean
    df = _read_csv_robust(DATA_BUCKET, raw_key)
    if df.empty:
        raise ValueError(f"Source CSV {raw_key} has 0 rows after read.")
    df = _clean(df)
    if df.empty:
        raise ValueError("All rows dropped during cleaning; aborting to avoid empty Parquet.")

    # write back to DATA_BUCKET only
    _write_parquet(df, DATA_BUCKET, CLEAN_KEY)
    summary = {
        "updated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "source_key": raw_key,
        "n_rows": int(len(df)),
        "n_cols": int(len(df.columns)),
        "preview_cols": list(df.columns[:12]),
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
