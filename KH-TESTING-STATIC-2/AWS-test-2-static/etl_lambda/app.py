import os
from etl import run

DATA_BUCKET    = os.environ["DATA_BUCKET"]
SITE_BUCKET    = os.environ["SITE_BUCKET"]
RAW_KEY        = os.environ["RAW_KEY"]
PROCESSED_KEY  = os.environ["PROCESSED_KEY"]

# Optional: avoid matplotlib “not writable” warning in Lambda
os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl")

def handler(event, context):
    run(DATA_BUCKET, SITE_BUCKET, RAW_KEY, PROCESSED_KEY)
    return {"status": "ok"}
