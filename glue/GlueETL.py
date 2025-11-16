import sys
<<<<<<< Updated upstream
=======
import io, json
import boto3
>>>>>>> Stashed changes
import datetime
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import functions as F

<<<<<<< Updated upstream
=======
s3 = boto3.client("s3")
>>>>>>> Stashed changes
# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
<<<<<<< Updated upstream

# === S3 Paths ===
input_path = "s3://cs5224-nicholasteo/landing/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv"
output_path = "s3://cs5224-nicholasteo/transformed/"

=======
args = getResolvedOptions(sys.argv, ['s3_bucket', 'input_path', 'output_path', 'summary_path'])

# === S3 Paths ===
#s3_bucket = "s3://www.propsights.site"
#input_path = "raw/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv"
#output_path = "cleaned/clean.parquet"
#summary_path = "processed/summary.json"
s3_bucket = args['s3_bucket']
input_path = args['input_path']
output_path = args['output_path']
summary_path = args['summary_path']

def _top_towns(df):
    """
    Compute top towns from a Spark DataFrame (percentage breakdown).
    Returns list of dicts: [{"town": "ANG MO KIO", "percent": 12.5}, ...]
    """
    # Find the "town" column case-insensitively
    town_col = next((c for c in df.columns if c.lower() == "town"), None)
    if not town_col:
        return []

    # Total count (for percentage calculation)
    total_count = df.filter(F.col(town_col).isNotNull()).count()
    if total_count == 0:
        return []

    # Compute stats
    top_df = (
        df
        .filter(F.col(town_col).isNotNull())
        .groupBy(F.col(town_col))
        .agg(F.count("*").alias("count"))
        .withColumn("percent", F.round(F.col("count") * 100.0 / total_count, 2))
        .select(
            F.col(town_col).alias("town"),
            "percent"
        )
        .orderBy(F.col("percent").desc())
    )

    # Convert Spark rows → list of dict
    return [row.asDict() for row in top_df.collect()]


def _put_json(bucket: str, key: str, obj: dict):
    """
    Same as your original function (no Spark changes needed).
    """
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        ContentType="application/json",
        CacheControl="max-age=60"
    )
>>>>>>> Stashed changes
# === Step 1: Read CSV from S3 into DynamicFrame ===
datasource = glueContext.create_dynamic_frame.from_options(
    format_options={"withHeader": True, "separator": ","},
    connection_type="s3",
    format="csv",
<<<<<<< Updated upstream
    connection_options={"paths": [input_path]},
=======
    connection_options={"paths": [s3_bucket+"/"+input_path]},
>>>>>>> Stashed changes
    transformation_ctx="datasource"
)

# Convert to Spark DataFrame for easier column manipulation
df = datasource.toDF()

# === Step 2: Transform Data ===
# Compute remaining lease years based on lease_commence_date
current_year = datetime.datetime.now().year
df = df.withColumn(
    "remaining_lease_years",
    F.lit(99) - (F.lit(current_year) - F.col("lease_commence_date").cast("int"))
)

# Drop unwanted columns if they exist
for col_name in ["remaining_lease", "lease_commence_date"]:
    if col_name in df.columns:
        df = df.drop(col_name)
<<<<<<< Updated upstream

=======
        
df.repartition(1).write.mode("overwrite").parquet(s3_bucket+"/"+output_path)
'''
>>>>>>> Stashed changes
# === Step 3: Convert back to DynamicFrame ===
transformed_dyf = DynamicFrame.fromDF(df, glueContext, "transformed_dyf")

# === Step 4: Write to Parquet in S3 ===
glueContext.write_dynamic_frame.from_options(
    frame=transformed_dyf,
    connection_type="s3",
    format="parquet",
    connection_options={"path": output_path, "partitionKeys": []},
    transformation_ctx="datasink"
)
<<<<<<< Updated upstream
=======
'''
# Build summary using Spark DataFrame `df`
summary = {
    "updated_at": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
    "source_key": input_path,
    "n_rows": df.count(),
    "n_cols": len(df.columns),
    "preview_cols": df.columns[:12],
    "town_stats": _top_towns(df),
}

#_put_json(s3_bucket, summary_path, summary)
>>>>>>> Stashed changes

print("✅ Glue job completed successfully — data written as Parquet to:", output_path)
