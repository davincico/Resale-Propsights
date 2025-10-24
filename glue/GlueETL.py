import sys
import datetime
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import functions as F

# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# === S3 Paths ===
input_path = "s3://cs5224-nicholasteo/landing/ResaleflatpricesbasedonregistrationdatefromJan2017onwards.csv"
output_path = "s3://cs5224-nicholasteo/transformed/"

# === Step 1: Read CSV from S3 into DynamicFrame ===
datasource = glueContext.create_dynamic_frame.from_options(
    format_options={"withHeader": True, "separator": ","},
    connection_type="s3",
    format="csv",
    connection_options={"paths": [input_path]},
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

print("✅ Glue job completed successfully — data written as Parquet to:", output_path)
