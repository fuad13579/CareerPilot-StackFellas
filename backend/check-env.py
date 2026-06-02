"""Debug: print which env vars Adzuna sees in this Python process."""
import os
import sys
print("PYTHON EXECUTABLE:", sys.executable)
print("CWD:", os.getcwd())
print("ADZUNA_APP_ID raw  :", repr(os.getenv("ADZUNA_APP_ID")))
print("ADZUNA_APP_KEY raw :", repr(os.getenv("ADZUNA_APP_KEY")))
print("ADZUNA_COUNTRY raw :", repr(os.getenv("ADZUNA_COUNTRY")))

# Also try reading backend/.env manually to confirm content
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
print("--- backend/.env (lines containing ADZUNA) ---")
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if "ADZUNA" in line:
                print(f"  {i}: {line.rstrip()}")
else:
    print(f"  NOT FOUND at {env_path}")
