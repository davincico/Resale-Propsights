import os
import json
import io
import boto3
import requests
import pandas as pd

# Environment variables
DATA_BUCKET = os.environ["DATA_BUCKET"]
RAW_PREFIX = os.environ.get("RAW_PREFIX", "raw/")
RESOURCE_ID = os.environ["RESOURCE_ID"]

DATASTORE_URL = "https://data.gov.sg/api/action/datastore_search"

# AWS S3 client
s3 = boto3.client("s3")


def _fetch_all_records(resource_id: str):
    all_records = []
    limit = 5000
    offset = 0

    while True:
        url = f"{DATASTORE_URL}?resource_id={resource_id}&limit={limit}&offset={offset}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        payload = response.json()

        records = payload["result"]["records"]
        all_records.extend(records)

        if len(records) < limit:
            break

        offset += limit

    return all_records


def _write_csv(df: pd.DataFrame, bucket: str, key: str):
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    s3.put_object(
        Bucket=bucket, 
        Key=key, 
        Body=buf.getvalue(),
        ContentType="text/csv"
    )


def lambda_handler(event, context):
    if not RESOURCE_ID:
        raise RuntimeError("RESOURCE_ID environment variable is not set.")

    try:
        records = _fetch_all_records(RESOURCE_ID)
        df = pd.DataFrame(records)

        filename = "ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv"
        s3_key = RAW_PREFIX + filename
        
        _write_csv(df, DATA_BUCKET, s3_key)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "message": f"CSV uploaded to s3://{DATA_BUCKET}/{s3_key}",
                "total_records": len(records)
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(e)})
        }