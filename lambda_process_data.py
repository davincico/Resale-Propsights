# lambda_handler.py
import os, json, boto3, pandas as pd
from io import BytesIO, StringIO
from datetime import datetime, timezone
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

s3 = boto3.client("s3")

def save_fig_to_s3(bucket, key, dpi=150):
    buf = BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=dpi)
    plt.close()
    buf.seek(0)
    s3.put_object(Bucket=bucket, Key=key, Body=buf.getvalue(), ContentType="image/png")

def lambda_handler(event, context):
    # 1) Get the raw CSV that triggered us
    rec = event["Records"][0]
    bucket = rec["s3"]["bucket"]["name"]
    raw_key = rec["s3"]["object"]["key"]   # e.g. raw/20251006/data.csv

    # 2) Read CSV from S3
    obj = s3.get_object(Bucket=bucket, Key=raw_key)
    df = pd.read_csv(obj["Body"])

    # 3) Versioned output prefix
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base = f"processed/{run_id}"

    # 4) (Optional) basic preprocessing examples
    if "price_per_sqm" not in df.columns and {"resale_price","floor_area_sqm"} <= set(df.columns):
        df["price_per_sqm"] = df["resale_price"] / df["floor_area_sqm"]

    # 5) Plot 1: Transactions per Town (%)
    (df["town"].value_counts(normalize=True)*100).plot(kind="bar", figsize=(15,8))
    plt.title("Number of Transactions per Town (%)"); plt.ylabel("Transaction Count (%)")
    save_fig_to_s3(bucket, f"{base}/plots/plot1_transactions_by_town.png")

    # 6) Plot 2: Transactions by Flat Model (%)
    (df["flat_model"].value_counts(normalize=True)*100).plot(kind="bar", figsize=(15,8))
    plt.title("Transactions by Flat Model (%)"); plt.ylabel("Percentage (%)")
    save_fig_to_s3(bucket, f"{base}/plots/plot2_by_flat_model.png")

    # 7) Plot 3: Storey range (%)
    (df["storey_range"].value_counts(normalize=True)*100).plot(kind="bar", figsize=(15,8))
    plt.title("Transactions by Storey Range (%)"); plt.ylabel("Percentage (%)")
    save_fig_to_s3(bucket, f"{base}/plots/plot3_storey_range.png")

    # 8) Plot 4: Remaining lease years distribution
    plt.figure(figsize=(10,6))
    sns.histplot(df["remaining_lease_years"], kde=True, stat="density")
    plt.title("Distribution of Remaining Years"); plt.xlabel("Remaining Years")
    save_fig_to_s3(bucket, f"{base}/plots/plot4_remaining_years.png")

    # 9) Plot 5: Number of transactions per Year (%)
    (df["year"].value_counts(normalize=True).sort_index()*100).plot(kind="bar", figsize=(15,8))
    plt.title("Number of Transactions per Year (%)"); plt.ylabel("Transaction Count (%)")
    save_fig_to_s3(bucket, f"{base}/plots/plot5_transactions_per_year.png")

    # 10) Plot 6: Violin of price per sqm by storey_range
    plt.figure(figsize=(12,8)); sns.set_palette("husl")
    order = sorted(df["storey_range"].dropna().unique(), key=lambda x: int(str(x).split()[0]))
    sns.violinplot(data=df, x="storey_range", y="price_per_sqm", order=order)
    plt.xticks(rotation=45); plt.title("Distribution of Resale Price per sqm by Storey Range")
    save_fig_to_s3(bucket, f"{base}/plots/plot6_violin_price_per_sqm.png")

    # 11) Save processed data
    out = StringIO(); df.to_csv(out, index=False)
    s3.put_object(Bucket=bucket, Key=f"{base}/data/cleaned_resale.csv",
                  Body=out.getvalue(), ContentType="text/csv")

    # 12) Summary JSON
    summary = {
        "run_id": run_id,
        "raw_key": raw_key,
        "rows": int(len(df)),
        "towns": int(df["town"].nunique()) if "town" in df.columns else None
    }
    s3.put_object(Bucket=bucket, Key=f"{base}/meta/summary.json",
                  Body=json.dumps(summary, indent=2), ContentType="application/json")

    return {"status": "ok", "output_prefix": f"s3://{bucket}/{base}/"}
