# transform_lambda.py
import io, json, boto3, pandas as pd

s3 = boto3.client("s3")

DATA_BUCKET = os.environ["DATA_BUCKET"]
RAW_KEY     = os.environ["RAW_KEY"]          # e.g. raw/your_latest.csv
OUT_KEY     = os.environ.get("OUT_KEY", "processed/clean.parquet")

def handler(event, context):
    # If triggered by S3 Put, pull key from event; else fall back to env RAW_KEY
    rec = (event.get("Records") or [{}])[0]
    key = rec.get("s3", {}).get("object", {}).get("key", RAW_KEY)

    obj = s3.get_object(Bucket=DATA_BUCKET, Key=key)
    df  = pd.read_csv(io.BytesIO(obj["Body"].read()), low_memory=False)

    # ---- do your cleaning/normalization here ----
    # (drop dups, strip strings, fix types, compute columns, etc.)
    df = df.drop_duplicates()
    for c in df.select_dtypes(include="object"):
        df[c] = df[c].astype(str).str.strip()

    # Save canonical dataset to parquet (small, fast)
    buf = io.BytesIO()
    df.to_parquet(buf, index=False)
    s3.put_object(Bucket=DATA_BUCKET, Key=OUT_KEY, Body=buf.getvalue(),
                  ContentType="application/octet-stream", CacheControl="no-store")

    return {"rows": len(df), "out_key": OUT_KEY}
