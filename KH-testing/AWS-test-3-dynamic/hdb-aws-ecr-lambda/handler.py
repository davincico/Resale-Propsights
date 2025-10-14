import json, os, urllib.parse, requests

DATASTORE_URL = "https://data.gov.sg/api/action/datastore_search"
RESOURCE_ID = os.getenv("RESOURCE_ID", "").strip()  # set in Lambda env

# Add/adjust to match columns in your resource
ALLOWED_FILTERS = {"town", "flat_type", "month"}

def _build_ckan_url(params):
    if not RESOURCE_ID:
        raise RuntimeError("Missing RESOURCE_ID environment variable")

    limit = int(params.get("limit", 50))
    offset = int(params.get("offset", 0))
    q = params.get("q")

    filt = {k: v for k, v in params.items() if k in ALLOWED_FILTERS and str(v).strip()}

    query = {"resource_id": RESOURCE_ID, "limit": limit, "offset": offset}
    if filt:
        query["filters"] = json.dumps(filt)
    if q:
        query["q"] = q

    return DATASTORE_URL + "?" + urllib.parse.urlencode(query)

def _cors_headers(origin="*"):
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
    }

def handler(event, context):
    # Handle CORS preflight if coming from API Gateway HTTP API v2
    method = event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _cors_headers()}

    params = event.get("queryStringParameters") or {}
    try:
        url = _build_ckan_url(params)
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        result = r.json().get("result", {})
        records = result.get("records", [])
        total = result.get("total", 0)

        # optional numeric range filters on resale_price
        def keep(rec):
            pmin = params.get("price_min")
            pmax = params.get("price_max")
            try:
                price = float(rec.get("resale_price", 0))
            except:
                price = 0
            if pmin and str(pmin).strip() and price < float(pmin): return False
            if pmax and str(pmax).strip() and price > float(pmax): return False
            return True

        filtered = [rec for rec in records if keep(rec)]

        return {
            "statusCode": 200,
            "headers": _cors_headers(),
            "body": json.dumps({
                "ok": True, "total": total, "count": len(filtered),
                "records": filtered,
                "source_limit": result.get("limit"),
                "source_offset": result.get("offset")
            })
        }
    except Exception as e:
        return {"statusCode": 500, "headers": _cors_headers(), "body": json.dumps({"ok": False, "error": str(e)})}
