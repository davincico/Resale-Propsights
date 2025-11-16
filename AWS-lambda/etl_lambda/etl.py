# etl.py — Lambda ETL that builds summary JSON + multiple charts
# Expects env vars (wired in app.py): DATA_BUCKET, SITE_BUCKET, RAW_KEY, PROCESSED_KEY

import io
import re
import json
import boto3
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

s3 = boto3.client("s3")
sns.set_palette("husl")


# ---------- helpers ----------

def _put_json(bucket: str, key: str, obj: dict):
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(obj).encode("utf-8"),
        ContentType="application/json",
        CacheControl="max-age=60",
    )

def _put_png(site_bucket: str, key: str, fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    s3.put_object(
        Bucket=site_bucket,
        Key=key,
        Body=buf.getvalue(),
        ContentType="image/png",
        CacheControl="max-age=300",
    )
    print(f"[OK] Wrote PNG s3://{site_bucket}/{key}")

def _pick_col(df: pd.DataFrame, *candidates) -> str | None:
    """Return first existing column matching any candidate (case-insensitive)."""
    low = {c.lower(): c for c in df.columns}
    for want in candidates:
        if want.lower() in low:
            return low[want.lower()]
    # fuzzy contains match
    for c in df.columns:
        if any(w in c.lower() for w in candidates):
            return c
    return None

def _parse_remaining_years(series: pd.Series) -> pd.Series:
    """Best-effort parse from strings like '92 years 03 months' -> float years."""
    if series.dtype.kind in "if":
        return series  # already numeric
    def parse(s: str) -> float | None:
        if not isinstance(s, str):
            return None
        m = re.search(r"(\d+)\s*year", s, re.I)
        y = float(m.group(1)) if m else 0.0
        m = re.search(r"(\d+)\s*month", s, re.I)
        mo = float(m.group(1)) if m else 0.0
        return y + mo/12.0 if (y or mo) else None
    out = series.apply(parse)
    return out

def _safe_bar_pct(df: pd.DataFrame, col: str, title: str, key: str, site_bucket: str, top_n: int | None = None):
    vc = (df[col].dropna().astype(str).value_counts(normalize=True) * 100)
    if top_n:
        vc = vc.head(top_n)
    fig, ax = plt.subplots(figsize=(15, 8))
    vc.round(2).plot(kind="bar", ax=ax)
    ax.set_title(title)
    ax.set_ylabel("Percentage (%)")
    ax.set_xlabel(col.replace("_", " ").title())
    plt.xticks(rotation=75)
    plt.tight_layout()
    _put_png(site_bucket, key, fig)

# ---------- main ETL ----------

def run(data_bucket: str, site_bucket: str, raw_key: str, processed_key: str) -> None:
    # 1) Load CSV from S3
    print(f"[INFO] Reading s3://{data_bucket}/{raw_key}")
    obj = s3.get_object(Bucket=data_bucket, Key=raw_key)
    df = pd.read_csv(io.BytesIO(obj["Body"].read()), low_memory=False)
    print(f"[INFO] Loaded {len(df):,} rows, {len(df.columns)} columns")

    # Standardize convenient derived columns
    # Town
    town_col = _pick_col(df, "town", "town_name", "town name")
    if not town_col:
        raise KeyError("Could not find a 'town' column (e.g., 'town', 'town_name').")

    # Year
    year_col = _pick_col(df, "year")
    if not year_col:
        month_col = _pick_col(df, "month")
        if month_col:
            df["__year"] = df[month_col].astype(str).str.slice(0, 4).astype("Int64")
            year_col = "__year"

    # Storey range / flat model (often present in HDB dataset)
    storey_col = _pick_col(df, "storey_range")
    flat_model_col = _pick_col(df, "flat_model")
    flat_type_col = _pick_col(df, "flat_type")

    # Price per sqm
    pps_col = _pick_col(df, "price_per_sqm", "price_psm")
    if not pps_col:
        price_col = _pick_col(df, "resale_price", "price")
        area_col = _pick_col(df, "floor_area_sqm", "area_sqm")
        if price_col and area_col:
            df["__price_per_sqm"] = pd.to_numeric(df[price_col], errors="coerce") / pd.to_numeric(df[area_col], errors="coerce")
            pps_col = "__price_per_sqm"

    # Remaining lease years
    rem_col = _pick_col(df, "remaining_lease_years", "remaining_lease_year", "remaining_lease")
    if rem_col:
        df["__remaining_years"] = _parse_remaining_years(df[rem_col])
        rem_col = "__remaining_years"

    # 2) Build summary JSON (top towns)
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

    # Write JSON to BOTH buckets (data for archival; site for same-origin fetch)
    _put_json(data_bucket, processed_key, summary)
    _put_json(site_bucket, "processed/eda_summary.json", summary)
    print(f"[OK] Wrote summary JSON to data + site buckets")

    # 3) Charts → site bucket
    # 3a) Transactions by Town (top 20)
    try:
        fig, ax = plt.subplots(figsize=(10, 5))
        top20 = top_df.head(20)
        ax.bar(top20["town"], top20["percent"])
        ax.set_title("Transactions by Town (%)")
        ax.set_xlabel("Town")
        ax.set_ylabel("Percent")
        ax.tick_params(axis="x", labelrotation=75)
        plt.tight_layout()
        _put_png(site_bucket, "assets/charts/transactions_by_town.png", fig)
    except Exception as e:
        print(f"[WARN] town chart failed: {e}")

    # 3b) By Flat Model
    try:
        if flat_model_col:
            _safe_bar_pct(df, flat_model_col, "Transactions by Flat Model (%)",
                          "assets/charts/by_flat_model.png", site_bucket)
        else:
            print("[INFO] Skipping flat-model chart (column not found)")
    except Exception as e:
        print(f"[WARN] flat-model chart failed: {e}")

    # 3c) By Storey Range
    try:
        if storey_col:
            _safe_bar_pct(df, storey_col, "Transactions by Storey Range (%)",
                          "assets/charts/by_storey_range.png", site_bucket)
        else:
            print("[INFO] Skipping storey-range chart (column not found)")
    except Exception as e:
        print(f"[WARN] storey-range chart failed: {e}")

    # 3d) Distribution of Remaining Years
    try:
        if rem_col and df[rem_col].notna().any():
            fig = plt.figure(figsize=(10, 6))
            sns.histplot(df[rem_col].dropna(), kde=True, stat="density")
            plt.title("Distribution of Remaining Years")
            plt.xlabel("Remaining Years")
            plt.tight_layout()
            _put_png(site_bucket, "assets/charts/remaining_years_dist.png", fig)
        else:
            print("[INFO] Skipping remaining-years chart (column not found or empty)")
    except Exception as e:
        print(f"[WARN] remaining-years chart failed: {e}")

    # 3e) Number of Transactions per Year
    try:
        if year_col:
            fig, ax = plt.subplots(figsize=(15, 8))
            (df[year_col].dropna().astype(int).value_counts(normalize=True)
             .sort_index().mul(100)).plot(kind="bar", ax=ax, color="#ef7993")
            ax.set_title("Number of Transactions per Year (%)")
            ax.set_ylabel("Transaction Count (%)")
            plt.tight_layout()
            _put_png(site_bucket, "assets/charts/transactions_per_year.png", fig)
        else:
            print("[INFO] Skipping per-year chart (no year column)")
    except Exception as e:
        print(f"[WARN] per-year chart failed: {e}")

    # 3f) Violin — price per sqm by storey range
    try:
        if pps_col and storey_col:
            # to keep memory/time reasonable
            sample = df[[storey_col, pps_col]].dropna()
            if len(sample) > 50000:
                sample = sample.sample(50000, random_state=42)
            order = sorted(sample[storey_col].astype(str).unique(),
                           key=lambda x: int(re.split(r"\D+", x)[0]) if re.split(r"\D+", x)[0].isdigit() else 0)
            fig = plt.figure(figsize=(12, 8))
            sns.violinplot(data=sample, x=storey_col, y=pps_col, order=order)
            plt.xticks(rotation=45)
            plt.title("Distribution of Resale Price per sqm by Storey Range")
            plt.tight_layout()
            _put_png(site_bucket, "assets/charts/price_psm_by_storey_violin.png", fig)
        else:
            print("[INFO] Skipping violin chart (need price_per_sqm + storey_range)")
    except Exception as e:
        print(f"[WARN] violin chart failed: {e}")

    # 3g) Correlation matrix (sample + selected dummies to keep size manageable)
    try:
        # pick numeric + a few categoricals for dummies
        cols = []
        for c in [pps_col, rem_col]:
            if c:
                cols.append(c)
        for c in [flat_type_col, flat_model_col, town_col]:
            if c:
                cols.append(c)
        if year_col:
            cols.append(year_col)

        corr_df = df[cols].copy()
        # small sample for compute efficiency
        if len(corr_df) > 30000:
            corr_df = corr_df.sample(30000, random_state=42)

        # dummies for categoricals
        cat_cols = [c for c in [flat_type_col, flat_model_col, town_col] if c]
        corr_df = pd.get_dummies(corr_df, columns=cat_cols, drop_first=True)

        corr = corr_df.corr(numeric_only=True)
        fig = plt.figure(figsize=(18, 12))
        sns.heatmap(corr, cmap="coolwarm")
        plt.title("Correlation Matrix")
        plt.tight_layout()
        _put_png(site_bucket, "assets/charts/corr_matrix.png", fig)
    except Exception as e:
        print(f"[WARN] correlation chart failed: {e}")

    print("[DONE] ETL finished.")
