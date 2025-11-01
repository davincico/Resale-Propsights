import os
from etl import run

# Env vars you’ll set on the Lambda:
DATA_BUCKET    = os.environ["DATA_BUCKET"]      # e.g. karhwee-data-propsights
SITE_BUCKET    = os.environ["SITE_BUCKET"]      # e.g. karhwee-site-propsights
RAW_KEY        = os.environ["RAW_KEY"]          # e.g. raw/hdb_resale.csv   (or clean.parquet if upstream transform)
PROCESSED_KEY  = os.environ["PROCESSED_KEY"]    # e.g. processed/eda_summary.json

# Avoid matplotlib write warnings in Lambda
os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl")

def handler(event, context):
    run(DATA_BUCKET, SITE_BUCKET, RAW_KEY, PROCESSED_KEY)
    return {"status": "ok"}
