# CareerPilot Deployment Notes

This document describes the current deployment model used by CareerPilot:

- frontend on Vercel
- backend on an Azure VM

It is written for judges and developers who want to reproduce the deployment shape without guessing the commands.

## Frontend Deployment on Vercel

### Project settings

- Framework preset: `Next.js`
- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`

### Required environment variable

Set in Vercel:

```env
BACKEND_URL=http://104.211.90.209
```

After changing `BACKEND_URL`, redeploy the frontend.

## Backend Deployment on Azure VM

### SSH command placeholder

```bash
ssh azureuser@104.211.90.209
```

### System packages

```bash
sudo apt update
sudo apt install -y git nginx python3.11 python3.11-venv python3-pip
```

### Clone or update the repository

Initial clone:

```bash
git clone https://github.com/fuad13579/CareerPilot-StackFellas.git
cd CareerPilot-StackFellas
```

Update an existing checkout:

```bash
cd CareerPilot-StackFellas
git pull
```

### Python virtual environment setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
```

### Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Configure backend environment

```bash
cp .env.example .env
```

Edit `backend/.env` and set the required values for your deployment.

### Uvicorn test command

Before wiring `systemd`, verify the backend starts:

```bash
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then test:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/health/providers
```

## Example systemd Service File

Create `/etc/systemd/system/careerpilot-backend.service`:

```ini
[Unit]
Description=CareerPilot backend
After=network.target

[Service]
User=azureuser
Group=azureuser
WorkingDirectory=/home/azureuser/CareerPilot-StackFellas/backend
EnvironmentFile=/home/azureuser/CareerPilot-StackFellas/backend/.env
ExecStart=/home/azureuser/CareerPilot-StackFellas/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable careerpilot-backend
sudo systemctl start careerpilot-backend
```

Current public backend endpoints through `nginx`:

- `http://104.211.90.209/health`
- `http://104.211.90.209/docs`

Direct backend-only endpoints on the VM:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## nginx Reverse Proxy Example

Example `/etc/nginx/sites-available/careerpilot`:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/careerpilot /etc/nginx/sites-enabled/careerpilot
sudo nginx -t
sudo systemctl restart nginx
```

## Azure Inbound Port Notes

Make sure the Azure NSG allows:

- `22` for SSH
- `80` for HTTP if using nginx
- optionally `8000` if you expose uvicorn directly during testing

## How to Check Backend Status

```bash
sudo systemctl status careerpilot-backend
sudo systemctl status nginx
curl http://127.0.0.1:8000/health
curl http://127.0.0.1/health
```

## How to Restart the Backend

```bash
sudo systemctl restart careerpilot-backend
sudo systemctl restart nginx
```

## How to Check Logs

```bash
sudo journalctl -u careerpilot-backend -n 200 --no-pager
sudo journalctl -u careerpilot-backend -f
sudo journalctl -u nginx -n 100 --no-pager
```

## Updating the Vercel Backend URL

If the backend IP or domain changes:

1. Open the Vercel project settings
2. Update `BACKEND_URL`
3. Trigger a redeploy

Without that update, the frontend proxy routes will continue forwarding to the old backend.

## Current Deployment Reality

The current design is suitable for a hackathon MVP because:

- it is easy to deploy quickly
- it matches the local-first storage model
- it avoids premature infrastructure complexity

For production scaling, the main future changes would be managed database, object storage, managed vector storage, HTTPS/domain hardening, and background workers.
