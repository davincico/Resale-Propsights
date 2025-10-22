# lambda_function.py
import json
import pandas as pd
import boto3
from io import StringIO

# Hardcoded S3 info
BUCKET_NAME = "resalehouse"
CSV_KEY = "full_data.csv"  # adjust if it’s in a folder inside S3

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Get query parameters
    params = event.get("queryStringParameters") or {}
    town = params.get("town", "all")
    flat_type = params.get("flat_type", "all")

    # Load CSV from S3
    try:
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=CSV_KEY)
        df = pd.read_csv(obj["Body"])
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Failed to load CSV from S3: {str(e)}"})
        }

    # Filter
    filtered_df = df.copy()
    if town != "all":
        filtered_df = filtered_df[filtered_df["town"] == town]
    if flat_type != "all":
        filtered_df = filtered_df[filtered_df["flat_type"] == flat_type]

    if filtered_df.empty:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "No data found for given filters"})
        }

    # Basic metrics
    total_sales = filtered_df.shape[0]
    avg_price = filtered_df["resale_price"].mean()
    latest_month = filtered_df["month"].max()
    max_price = filtered_df["resale_price"].max()

    # Aggregations
    avg_price_by_flat_type_by_month_df = (
        filtered_df.groupby(["flat_type", "month"])["resale_price"].mean().reset_index()
    )
    avg_price_by_flat_type_by_month = (
        avg_price_by_flat_type_by_month_df
        .pivot_table(index="flat_type", columns="month", values="resale_price")
        .fillna(-1)
        .to_dict(orient="index")
    )

    avg_price_by_flat_type_by_town_df = (
        filtered_df.groupby(["flat_type", "town"])["resale_price"].mean().reset_index()
    )
    avg_price_by_flat_type_by_town = (
        avg_price_by_flat_type_by_town_df
        .pivot_table(index="town", columns="flat_type", values="resale_price")
        .fillna(0)
        .to_dict(orient="index")
    )

    count_by_flat_type = filtered_df.groupby(["flat_type"])["resale_price"].count().to_dict()

    result = {
        "total_sales": total_sales,
        "average_price": avg_price,
        "latest_month": latest_month,
        "max_price": max_price,
        "avg_price_by_flat_type_by_month": avg_price_by_flat_type_by_month,
        "avg_price_by_flat_type_by_town": avg_price_by_flat_type_by_town,
        "flat_type_distribution": count_by_flat_type,
    }

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(result)
    }
