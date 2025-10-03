import os
import json
import logging
import requests
import boto3

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create an S3 client
s3_client = boto3.client('s3')
s3_bucket = os.environ['S3_BUCKET']  # Make sure this environment variable is set

"""
This lambda function fetches data from a public API and stores it in an S3 bucket.

API dataset:
Resale flat prices based on registration date from Jan-2017 onwards
dataset_id = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc"
url = "https://data.gov.sg/api/action/datastore_search?resource_id=" + dataset_id

Import to AWS Lambda:
- cd into folder
- pip install -t requests boto3 . (this installs requirements into target dir rather than default python site locations)
- Zip this entire folder
file must be named lambda_function.py for aws to recognize the handler 

Name of S3 bucket must be set in environment variable S3_BUCKET:
resale-api-jan2017

Create test event in AWS Lambda with:
{
  "api_url":"https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc",
  "s3_key":"test-data.json"
}
"""

def fetch_and_store(api_url, s3_key):
    """
    Fetch data from an API and store it in S3.
    """
    try:
        logger.info(f"Fetching data from API: {api_url}")
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Convert the data to a JSON string
        data_string = json.dumps(data)

        # Write data to S3
        logger.info(f"Writing fetched data to S3: Bucket={s3_bucket}, Key={s3_key}")
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=data_string
        )
        
        logger.info(f"Data stored in S3 under key: {s3_key}.")
        return {"status": "success", "data": data}
    
    except Exception as e:
        logger.error(f"Failed to fetch/store API data: {e}")
        return {"status": "error", "message": str(e)}

def lambda_handler(event, context):
    """
    Lambda entry point: Expects 'api_url' and 's3_key' in the event.
    """
    api_url = event.get("api_url")
    s3_key = event.get("s3_key") 

    # Input validation
    if not api_url or not s3_key:
        logger.error("Missing parameters: 'api_url' or 's3_key'.")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing parameters"})
        }

    # Fetch from API and store in S3
    result = fetch_and_store(api_url, s3_key)
    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }

"""
Appendix:
To embed the data explorer in a web page, use the following HTML snippet:
<iframe
  width="600"
  height="600"
  src="https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/explorer"
  frameborder="0"
>
</iframe>

"""