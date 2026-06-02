"""Quick shape inspector for an Adzuna raw result row."""
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=False)

app_id = os.environ["ADZUNA_APP_ID"]
app_key = os.environ["ADZUNA_APP_KEY"]

url = "https://api.adzuna.com/v1/api/jobs/us/search/1"
params = {
    "app_id": app_id,
    "app_key": app_key,
    "results_per_page": 2,
    "what": "python",
    "content-type": "application/json",
}

with httpx.Client(timeout=10.0) as c:
    r = c.get(url, params=params)
    r.raise_for_status()
    data = r.json()

first = data["results"][0]
print("=== TOP-LEVEL KEYS ===")
print(sorted(first.keys()))
print()
print("=== description type:", type(first.get("description")).__name__, "===")
desc = first.get("description")
if isinstance(desc, str):
    print("string len:", len(desc))
    print("first 400 chars:", desc[:400])
elif isinstance(desc, list):
    print("list len:", len(desc))
    for i, item in enumerate(desc):
        print(f"  [{i}] type={type(item).__name__}", end="")
        if isinstance(item, dict):
            print(f" keys={list(item.keys())}")
            print(f"      value={item}")
        elif isinstance(item, str):
            print(f" sample={item[:120]!r}")
        else:
            print(f" value={item!r}")
else:
    print("value:", repr(desc)[:400])
print()
print("=== category type:", type(first.get("category")).__name__, "===")
print(repr(first.get("category"))[:200])
print()
print("=== FULL first row (truncated) ===")
s = json.dumps(first, indent=2, default=str)
print(s[:2500])
