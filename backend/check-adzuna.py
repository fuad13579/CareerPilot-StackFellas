"""Hit Adzuna directly to see the exact JSON shape."""
import os
import httpx

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), ".env")), override=False)

app_id  = os.getenv("ADZUNA_APP_ID", "").strip()
app_key = os.getenv("ADZUNA_APP_KEY", "").strip()
print("app_id:", app_id)
print("app_key:", app_key)

url = f"https://api.adzuna.com/v1/api/jobs/us/search/1"
params = {
    "app_id": app_id,
    "app_key": app_key,
    "results_per_page": 3,
    "what": "python",
    "content-type": "application/json",
}
r = httpx.get(url, params=params, timeout=15)
print("status:", r.status_code)
import json
try:
    data = r.json()
    print("top-level keys:", list(data.keys()))
    results = data.get("results", [])
    print("results count:", len(results))
    if results:
        print("first result keys:", list(results[0].keys()))
        print("first result:")
        print(json.dumps(results[0], indent=2)[:1500])
except Exception as e:
    print("not JSON:", e)
    print("body:", r.text[:500])
