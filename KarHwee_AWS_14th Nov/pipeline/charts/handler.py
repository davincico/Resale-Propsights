# charts/handler.py
import os
# Must be set BEFORE importing matplotlib in Lambda
os.environ["MPLCONFIGDIR"] = "/tmp/mpl"

import io
import re
import boto3
import pandas as pd

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_palette("husl")
s3 = boto3.client("s3")

# ---------------------- env & normalization ----------------------
DATA_BUCKET   = os.environ["DATA_BUCKET"].strip()          # e.g. kh-propsight-data
SITE_BUCKET   = os.environ["SITE_BUCKET"].strip()          # e.g. kh-propsight-site
CLEAN_KEY     = os.getenv("CLEAN_KEY", "clean/clean.parquet").lstrip("/")
SUMMARY_KEY   = os.getenv("SUMMARY_KEY", "processed/eda_summary.json").lstrip("/")

# support either name; prefer CHARTS_PREFIX, fallback to ASSETS_PREFIX
_prefix_env   = os.getenv("CHARTS_PREFIX", os.getenv("ASSETS_PREFIX", "assets/charts/"))
ASSETS_PREFIX = _prefix_env.strip().lstrip("/")
if ASSETS_PREFIX and not ASSETS_PREFIX.endswith("/"):
    ASSETS_PREFIX += "/"

# ---------------------- helpers ----------------------
def _site_key(key: str) -> str:
    return key if key.startswith(ASSETS_PREFIX) else f"{ASSETS_PREFIX}{key}"

def _put_png(key: str, fig) -> None:
    """Write fig as PNG to the site bucket under ASSETS_PREFIX/."""
    key = _site_key(key)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    s3.put_object(
        Bucket=SITE_BUCKET,
        Key=key,
        Body=buf.getvalue(),
        ContentType="image/png",
        CacheControl="no-store",
    )
    print(f"[OK] wrote s3://{SITE_BUCKET}/{key}")

def _copy_summary_to_site():
    """Copy processed/eda_summary.json from the DATA bucket to the SITE bucket."""
    # Safer across accounts/regions than copy_object: GET then PUT
    print(f"[INFO] copying summary {SUMMARY_KEY} → site bucket")
    obj = s3.get_object(Bucket=DATA_BUCKET, Key=SUMMARY_KEY)
    s3.put_object(
        Bucket=SITE_BUCKET,
        Key=SUMMARY_KEY,
        Body=obj["Body"].read(),
        ContentType="application/json",
        CacheControl="no-store",
    )
    print(f"[OK] wrote s3://{SITE_BUCKET}/{SUMMARY_KEY}")

def _pick_col(df: pd.DataFrame, *candidates) -> str | None:
    """Return first existing column matching any candidate (case-insensitive / contains)."""
    low = {c.lower(): c for c in df.columns}
    for want in candidates:
        w = want.lower()
        if w in low:
            return low[w]
    for c in df.columns:
        lc = c.lower()
        if any(w.lower() in lc for w in candidates):
            return c
    return None

YEAR_PAT  = re.compile(r"(\d+)\s*year", re.I)
MONTH_PAT = re.compile(r"(\d+)\s*month", re.I)

def _parse_remaining_years(series: pd.Series) -> pd.Series:
    """Return float years (e.g., '87 years 5 months' -> 87.42). Handles blank/NaN."""
    def parse(s):
        if pd.isna(s):
            return None
        s = str(s)
        try:
            val = float(s)
            if val >= 0:
                return round(val, 2)
        except Exception:
            pass
        y = int(YEAR_PAT.search(s).group(1)) if YEAR_PAT.search(s) else 0
        m = int(MONTH_PAT.search(s).group(1)) if MONTH_PAT.search(s) else 0
        return round(y + m / 12.0, 2)
    return series.apply(parse)

def _safe_bar_pct(df: pd.DataFrame, col: str, title: str, out_name: str, top_n: int | None = None) -> None:
    vc = (df[col].dropna().astype(str).value_counts(normalize=True) * 100.0)
    if top_n:
        vc = vc.head(top_n)
    fig, ax = plt.subplots(figsize=(15, 8))
    vc.round(2).plot(kind="bar", ax=ax)
    ax.set_title(title)
    ax.set_ylabel("Percentage (%)")
    ax.set_xlabel(col.replace("_", " ").title())
    plt.xticks(rotation=75)
    plt.tight_layout()
    _put_png(out_name, fig)

def _numeric_prefix(s: str) -> int:
    m = re.search(r"\d+", str(s))
    return int(m.group()) if m else 0

# ---------------------- main ----------------------
def _run(event, context):
    # 1) Read clean parquet from S3 (DATA bucket)
    print(f"[INFO] reading s3://{DATA_BUCKET}/{CLEAN_KEY}")
    obj = s3.get_object(Bucket=DATA_BUCKET, Key=CLEAN_KEY)
    df  = pd.read_parquet(io.BytesIO(obj["Body"].read()), engine="pyarrow")
    print(f"[INFO] loaded {len(df):,} rows, {len(df.columns)} cols")

    if df.empty:
        print("[WARN] clean parquet is empty; charts will be skipped.")
        return {
            "ok": False,
            "reason": "clean.parquet empty",
            "read": f"s3://{DATA_BUCKET}/{CLEAN_KEY}",
            "wrote_prefix": f"s3://{SITE_BUCKET}/{ASSETS_PREFIX}",
        }

    # ---- discover columns ----
    town_col       = _pick_col(df, "town", "town_name", "town name")
    storey_col     = _pick_col(df, "storey_range")
    flat_model_col = _pick_col(df, "flat_model")
    flat_type_col  = _pick_col(df, "flat_type")
    year_col       = _pick_col(df, "year", "yr")
    price_psm_col  = _pick_col(df, "price_per_sqm", "price_psm", "unit_price", "unit_psm", "psm")
    rem_col        = _pick_col(df, "remaining_years", "remaining_lease_years", "remaining_lease_year", "remaining_lease")

    # ---- derive missing columns so charts don't silently skip ----
    if rem_col:
        df["_remaining_years"] = _parse_remaining_years(df[rem_col])
        rem_col = "_remaining_years"

    if not price_psm_col:
        price_col = _pick_col(df, "resale_price", "price")
        area_col  = _pick_col(df, "floor_area_sqm", "area_sqm", "floor_area", "sqm")
        if price_col and area_col:
            df["_price_psm"] = (
                pd.to_numeric(df[price_col], errors="coerce") /
                pd.to_numeric(df[area_col],  errors="coerce")
            ).round(2)
            price_psm_col = "_price_psm"

    if not year_col:
        mcol = _pick_col(df, "month", "transaction_month", "sale_month",
                         "date", "transaction_date", "sale_date")
        if mcol:
            dt = pd.to_datetime(df[mcol], errors="coerce")
            if hasattr(dt, "dt"):
                df["_year"] = dt.dt.year
                if df["_year"].notna().any():
                    year_col = "_year"

    # 2) Charts
    # 2a) Transactions by Town (top 20)
    try:
        if town_col and not df[town_col].dropna().empty:
            top = (df[town_col].dropna().astype(str)
                   .value_counts(normalize=True).mul(100)
                   .rename_axis("town").reset_index(name="percent")).head(20)
            fig, ax = plt.subplots(figsize=(12, 6))
            ax.bar(top["town"], top["percent"])
            ax.set_title("Transactions by Town (%)")
            ax.set_xlabel("Town"); ax.set_ylabel("Percent")
            ax.tick_params(axis="x", labelrotation=75)
            plt.tight_layout()
            _put_png("transactions_by_town.png", fig)
        else:
            print("[INFO] skip town chart (missing/empty)")
    except Exception as e:
        print(f"[WARN] town chart failed: {e}")

    # 2b) By Flat Model
    try:
        if flat_model_col and df[flat_model_col].notna().any():
            _safe_bar_pct(df, flat_model_col, "Transactions by Flat Model (%)",
                          "by_flat_model.png")
        else:
            print("[INFO] skip flat-model (missing/empty)")
    except Exception as e:
        print(f"[WARN] flat-model chart failed: {e}")

    # 2c) By Storey Range
    try:
        if storey_col and df[storey_col].notna().any():
            _safe_bar_pct(df, storey_col, "Transactions by Storey Range (%)",
                          "by_storey_range.png")
        else:
            print("[INFO] skip storey-range (missing/empty)")
    except Exception as e:
        print(f"[WARN] storey-range chart failed: {e}")

    # 2d) Distribution of Remaining Years
    try:
        if rem_col and df[rem_col].notna().any():
            fig = plt.figure(figsize=(10, 6))
            sns.histplot(df[rem_col].dropna(), kde=True, stat="density")
            plt.title("Distribution of Remaining Years")
            plt.xlabel("Remaining Years")
            plt.tight_layout()
            _put_png("remaining_years_dist.png", fig)
        else:
            print("[INFO] skip remaining-years (col missing/empty)")
    except Exception as e:
        print(f"[WARN] remaining-years chart failed: {e}")

    # 2e) Number of Transactions per Year
    try:
        if year_col and df[year_col].notna().any():
            fig, ax = plt.subplots(figsize=(15, 8))
            (df[year_col].dropna().astype(int)
                .value_counts(normalize=True)
                .sort_index().mul(100)).plot(kind="bar", ax=ax)
            ax.set_title("Number of Transactions per Year (%)")
            ax.set_ylabel("Transaction Count (%)")
            plt.tight_layout()
            _put_png("transactions_per_year.png", fig)
        else:
            print("[INFO] skip per-year (no usable year)")
    except Exception as e:
        print(f"[WARN] per-year chart failed: {e}")

    # 2f) Violin — price per sqm by storey range
    try:
        if price_psm_col and storey_col:
            sample = df[[storey_col, price_psm_col]].dropna()
            if not sample.empty:
                if len(sample) > 50_000:
                    sample = sample.sample(50_000, random_state=42)
                order = sorted(sample[storey_col].astype(str).unique(),
                               key=_numeric_prefix)
                fig = plt.figure(figsize=(12, 8))
                sns.violinplot(data=sample, x=storey_col, y=price_psm_col, order=order)
                plt.xticks(rotation=45)
                plt.title("Distribution of Resale Price per sqm by Storey Range")
                plt.tight_layout()
                _put_png("price_psm_by_storey_violin.png", fig)
            else:
                print("[INFO] skip violin (no data after dropna)")
        else:
            print("[INFO] skip violin (need price_per_sqm + storey_range)")
    except Exception as e:
        print(f"[WARN] violin chart failed: {e}")

    # 2g) Correlation matrix
    try:
        use_cols = [c for c in [
            price_psm_col, rem_col, flat_type_col, flat_model_col, town_col, year_col
        ] if c]
        if use_cols:
            corr_df = df[use_cols].copy()
            if len(corr_df) > 30_000:
                corr_df = corr_df.sample(30_000, random_state=42)
            cat_cols = [c for c in [flat_type_col, flat_model_col, town_col] if c]
            if cat_cols:
                corr_df = pd.get_dummies(corr_df, columns=cat_cols, drop_first=True)
            num = corr_df.select_dtypes("number").dropna()
            if not num.empty:
                corr = num.corr(numeric_only=True)
                fig = plt.figure(figsize=(18, 12))
                sns.heatmap(corr, cmap="coolwarm")
                plt.title("Correlation Matrix")
                plt.tight_layout()
                _put_png("corr_matrix.png", fig)
            else:
                print("[WARN] correlation chart skipped (no numeric rows)")
        else:
            print("[INFO] skip correlation (insufficient cols)")
    except Exception as e:
        print(f"[WARN] correlation chart failed: {e}")

    # 3) copy summary JSON into the public site bucket so the webpage can fetch it
    try:
        _copy_summary_to_site()
    except Exception as e:
        print(f"[WARN] summary copy failed: {e}")

    return {
        "status": "ok",
        "read": f"s3://{DATA_BUCKET}/{CLEAN_KEY}",
        "wrote_prefix": f"s3://{SITE_BUCKET}/{ASSETS_PREFIX}",
        "summary_json": f"s3://{SITE_BUCKET}/{SUMMARY_KEY}",
    }

# Lambda entry point
def lambda_handler(event, context):
    return _run(event, context)

# Backward-compat (if image CMD is 'handler.handler')
def handler(event, context):
    return _run(event, context)
