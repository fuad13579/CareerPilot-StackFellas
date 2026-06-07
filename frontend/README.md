# CareerPilot Frontend

The frontend is a Next.js App Router application for CareerPilot. It renders the user-facing flows for CV upload, jobs, fit-score review, assistant chat, cover-letter generation, tracker, and productivity tools.

## Frontend Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lucide React
- `@dnd-kit/*` for tracker drag-and-drop

## Pages and Routes

Implemented pages in `src/app/`:

- `/` landing page
- `/dashboard`
- `/upload`
- `/jobs`
- `/assistant`
- `/cover-letter`
- `/tracker`
- `/productivity`

The frontend also defines proxy route handlers under `src/app/api/*` for:

- CV upload and section lookup
- assistant query and history
- jobs search
- cover letter generation
- tracker CRUD
- todo CRUD and stats
- calendar CRUD
- RAG status

## Environment Variables

Create `frontend/.env.local` from `frontend/.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | Yes for deployed/proxy use | Base URL of the FastAPI backend |

Example:

```env
BACKEND_URL=http://127.0.0.1:8000
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend default URL:

- `http://localhost:3000`

## Build and Quality Commands

```bash
npm run build
npm run start
npm run lint
```

## How the Frontend Connects to the Backend

The browser mostly talks to Next.js route handlers inside `src/app/api/*`. Those handlers forward requests to:

- `process.env.BACKEND_URL`, or
- `http://localhost:8000` if `BACKEND_URL` is not set

There is also a rewrite in `next.config.ts` for `/api/:path*` to `http://localhost:8000/api/:path*`, which supports local development. For deployed environments, the route handlers and `BACKEND_URL` are the important path to document and configure.

This design keeps backend secrets off the client and gives one place to swap backend hosts between local and deployed environments.

## Vercel Deployment

Recommended Vercel settings:

- Framework preset: `Next.js`
- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`

Required Vercel environment variable:

```env
BACKEND_URL=http://<your-backend-host>
```

After changing `BACKEND_URL`, redeploy the frontend.

## Notes

- The frontend depends on a reachable backend for core product flows.
- If the frontend is served over HTTPS and the backend is still plain HTTP, mixed-content issues may appear in stricter environments.
- Anonymous user state is stored in browser `localStorage`, including the generated CareerPilot user id and assistant session id.
