# CareerPilot Frontend

Next.js frontend for CareerPilot, the StackFellas CodeSprint 2026 project.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

The app will be available at:

- `http://localhost:3000`

## Backend Connection

The frontend talks to the backend through Next.js API routes under `src/app/api/*`.

For local development, those routes forward to:

- `http://localhost:8000`

For deployed environments, set:

```env
BACKEND_URL=http://your-backend-host
```

Examples:

- local backend: `BACKEND_URL=http://localhost:8000`
- Azure VM backend: `BACKEND_URL=http://104.211.90.209`

## Vercel Deployment

Use these settings in Vercel:

- Framework: `Next.js`
- Root Directory: `frontend`
- Build Command: default
- Install Command: default
- Output Directory: default

Required environment variable:

```env
BACKEND_URL=http://104.211.90.209
```

After changing environment variables, redeploy the project.

## Main User Flows

- `/upload` - CV upload and parsing
- `/jobs` - live job search and fit scoring
- `/assistant` - CV-grounded assistant
- `/cover-letter` - job-specific cover letter generation
- `/tracker` - application Kanban board
- `/productivity` - todos, calendar, goals, and nudges

## Notes

- The deployed frontend depends on the backend being reachable publicly.
- If the frontend is on `https` and the backend is on `http`, some browser/security issues may appear. For a stronger deployment, put HTTPS in front of the backend later.
