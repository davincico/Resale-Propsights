# lambda_function.py
import json
import boto3
import polars as pl
from io import BytesIO
import os
import s3fs

BUCKET_NAME = os.environ['BUCKET_NAME']
PARQUET_PATH = f"s3://{BUCKET_NAME}/{os.environ['PARQUET_PATH']}"

fs = s3fs.S3FileSystem()

def lambda_handler(event, context):
    # Get query parameters
    params = event.get("queryStringParameters") or {}
    town = params.get("town", "all")
    flat_type = params.get("flat_type", "all")


    # Load Parquet from S3
    try:
        paths = fs.glob(PARQUET_PATH+"*.parquet")

        if not paths:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "No parquet files found"})
            }

        # Load all parquet files into Polars (fast)
        dfs = []
        for f in paths:
            with fs.open(f, "rb") as f_obj:
                data = f_obj.read()
                dfs.append(pl.read_parquet(BytesIO(data)))

        df = pl.concat(dfs)
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Failed to load CSV from S3: {str(e)}"})
        }

    # Filter
    if town != "all":
        df = df.filter(pl.col("town") == town)
    if flat_type != "all":
        df = df.filter(pl.col("flat_type") == flat_type)

    if df.height == 0:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "No data found for given filters"})
        }
    
    # cast floor_area_sqm and resale_price to float32
    df = df.with_columns([
        pl.col("floor_area_sqm").cast(pl.Float32),
        pl.col("resale_price").cast(pl.Float32)
    ])
    
    # df = df.with_columns([
    #     pl.col("floor_area_sqm").round(1),
    #     pl.col("resale_price").round(1)
    # ])

    # Basic metrics
    total_sales = df.height
    avg_price = df["resale_price"].mean()
    latest_month = df["month"].max()
    max_price = df["resale_price"].max()

    # Aggregations
    avg_price_by_flat_type_by_month_df = (
        df.group_by(["flat_type", "month"])
        .agg(pl.col("resale_price").mean().alias("avg_price").round(1))
        .pivot(index="flat_type", columns="month", values="avg_price")
        .fill_null(-1)
    )
    avg_price_by_flat_type_by_month = {
        row['flat_type']: {k: v for k, v in row.items() if k != 'flat_type'}
        for row in avg_price_by_flat_type_by_month_df.to_dicts()
    }

    avg_price_by_flat_type_by_town_df = (
        df.group_by(["flat_type", "town"])
        .agg(pl.col("resale_price").mean().alias("avg_price").round(1))
        .pivot(index="town", columns="flat_type", values="avg_price")
        .fill_null(0)
    )
    avg_price_by_flat_type_by_town = {
        row['town']: {k: v for k, v in row.items() if k != 'town'}
        for row in avg_price_by_flat_type_by_town_df.to_dicts()
    }

    count_by_flat_type_df = (
        df.group_by("flat_type")
          .agg(pl.count("resale_price").alias("count"))
    )

    count_by_flat_type = {row['flat_type']: row['count'] for row in count_by_flat_type_df.to_dicts()}

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
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(result)
    }
