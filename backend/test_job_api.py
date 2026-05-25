import httpx
import json

try:
    # Try 127.0.0.1
    response = httpx.post(
        'http://127.0.0.1:8000/api/jobs/search',
        json={'query': 'Find remote Python backend jobs'},
        timeout=30.0
    )
    print('Status:', response.status_code)
    print('Response:', json.dumps(response.json(), indent=2))
except Exception as e:
    print(f'Error with 127.0.0.1: {e}')
    
try:
    # Try localhost
    response = httpx.post(
        'http://localhost:8000/api/jobs/search',
        json={'query': 'Find remote Python backend jobs'},
        timeout=30.0
    )
    print('Status:', response.status_code)
    print('Response:', json.dumps(response.json(), indent=2))
except Exception as e:
    print(f'Error with localhost: {e}')