import io, os, json, boto3
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime

s3 = boto3.client("s3")

# try to find a 'town' column (case-insensitive, common variants)
def _pick_town_col(df: pd.DataFrame) -> str:
    candidates = {"town", "town_name", "town name"}
    cols = {c.lower(): c for c in df.columns}
    for want in candidates:
        if want in cols:
            return cols[want]
    # fall back: best-effort fuzzy match
    for c in df.columns:
        if "town" in c.lower():
            return c
    raise KeyError("Could not find a 'town' column in the CSV.")

def run(data_bucket: str, site_bucket: str, raw_key: str, processed_key: str) -> None:
    # 1) read CSV from s3
    obj = s3.get_object(Bucket=data_bucket, Key=raw_key)
    df = pd.read_csv(io.BytesIO(obj["Body"].read()), low_memory=False)

    # choose the actual town column name
    town_col = _pick_town_col(df)

    # 2) small summary JSON for API/UI
    #    Use rename_axis + reset_index(name=...) so we ALWAYS get
    #    columns named exactly 'town' and 'percent'
    top_df = (
        df[town_col]
        .value_counts(normalize=True)
        .mul(100).round(2)
        .rename_axis("town")
        .reset_index(name="percent")
    )

    summary = {
        "updated_at": datetime.utcnow().isoformat(),
        "n_rows": int(len(df)),
        "town_stats": top_df.to_dict("records"),
    }

    s3.put_object(
        Bucket=data_bucket,
        Key=processed_key,
        Body=json.dumps(summary).encode("utf-8"),
        ContentType="application/json",
    )

    # 3) optional chart pushed to site bucket
    fig, ax = plt.subplots(figsize=(10, 5))
    top = top_df.head(20)
    ax.bar(top["town"], top["percent"])
    ax.set_title("Transactions by Town (%)")
    ax.set_xlabel("Town")
    ax.set_ylabel("Percent")
    ax.tick_params(axis="x", labelrotation=75)
    plt.tight_layout()

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=180)
    plt.close(fig)
    buf.seek(0)

    s3.put_object(
        Bucket=site_bucket,
        Key="assets/charts/transactions_by_town.png",
        Body=buf.getvalue(),
        ContentType="image/png",
        CacheControl="max-age=300",
    )
