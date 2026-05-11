# TokenLedger

TokenLedger is an AI gateway and observability dashboard for governed LLM usage. Applications send prompts to one FastAPI endpoint, and TokenLedger handles API-key checks, PII blocking, model routing, semantic cache lookup, optional MCP tool context, cost calculation, and audit logging before returning a response.

The project includes a polished Next.js dashboard for live operations: gateway status, spend, latency, model routing, cache behavior, policy outcomes, request traces, and audit evidence.

## Features

- FastAPI gateway on port `8000` with `POST /v1/chat`.
- API-key protection through the `X-API-Key` header.
- PII and secret detection before model calls.
- Model routing between small and large Groq models.
- Semantic cache hooks backed by Postgres and pgvector.
- MCP server on port `8001` for governed internal tools:
  - `@cost` calls `get_cost_summary`
  - `@docs` calls `search_internal_docs`
  - `@budget` calls `check_budget_limit`
- Audit log and dashboard metrics:
  - `GET /v1/audit?limit=20`
  - `GET /v1/dashboard/stats`
  - `GET /v1/dashboard/timeseries?metric=cost&days=7`
- Next.js dashboard with:
  - Collapsible responsive sidebar
  - Backend and database readiness indicators
  - Cost, request, cache, and latency metric cards
  - Model usage and cost trend charts
  - Chat playground
  - Pipeline trace
  - Audit table and request detail panel
  - Light and dark themes with persisted preference

## Tech Stack

Backend:

- FastAPI
- psycopg3 and psycopg-pool
- Postgres with pgvector
- Groq LLM API
- Ollama embeddings at `http://localhost:11434`
- MCP Python SDK

Frontend:

- Next.js App Router
- React and TypeScript
- Tailwind CSS v4
- Recharts
- Lucide icons
- Next API routes as a backend-for-frontend proxy

## Architecture

```mermaid
flowchart LR
  A[Next.js Dashboard] --> B[Next API Proxy]
  B --> C[FastAPI Gateway]
  C --> D[PII Detector]
  D --> E[Semantic Cache and Router]
  E --> F[Groq LLM]
  E --> G[MCP Server]
  G --> H[Postgres + pgvector]
  E --> I[Ollama Embeddings]
  C --> H
```

The dashboard does not call the FastAPI API key directly from browser code. It calls `frontend/src/app/api/tokenledger/*`; those server-side Next routes forward requests to the backend and inject `TOKENLEDGER_API_KEY`.

## Ports

- Next.js dashboard: `3000`
- FastAPI gateway: `8000`
- MCP server: `8001`
- Postgres host port: `15433`
- Ollama default: `11434`

## Environment Variables

Backend `.env`:

```env
GROQ_API_KEY=your-groq-key
DATABASE_URL=postgresql://tokenledger:tokenledger@localhost:15433/tokenledger
FALLBACK_TO_SQLITE=false
ENVIRONMENT=development
API_KEY=dev-secret-key-123
MCP_SERVER_URL=http://127.0.0.1:8001
```

Frontend `.env.local`:

```env
TOKENLEDGER_BACKEND=http://127.0.0.1:8000
TOKENLEDGER_API_KEY=dev-secret-key-123
```

Keep `TOKENLEDGER_API_KEY` server-side. The current dashboard uses Next API routes so the demo key is not exposed through client-side environment variables.

## Local Setup

1. Create env files:

```powershell
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

2. Edit `backend/.env` and set a real `GROQ_API_KEY`.

3. Start Postgres:

```powershell
docker compose up -d
```

4. Apply the database schema if needed:

```powershell
docker compose cp migrations/001_init.sql postgres:/tmp/001_init.sql
docker compose exec -T postgres psql -U tokenledger -d tokenledger -f /tmp/001_init.sql
```

5. Start the MCP server:

```powershell
$env:DATABASE_URL="postgresql://tokenledger:tokenledger@localhost:15433/tokenledger"
python mcp_server/server.py
```

6. Start the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:GROQ_API_KEY="YOUR_GROQ_KEY"
$env:API_KEY="dev-secret-key-123"
$env:DATABASE_URL="postgresql://tokenledger:tokenledger@localhost:15433/tokenledger"
$env:MCP_SERVER_URL="http://127.0.0.1:8001"
python run.py
```

7. Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Frontend Commands

Run these from `frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

`npm run dev` starts Next.js on `http://localhost:3000`. `npm run build` creates a production build. `npm run preview` runs the built app with `next start` after a successful build.

## Backend Smoke Commands

Health:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"
```

Readiness:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/ready"
```

Dashboard stats:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/v1/dashboard/stats"
```

PII block:

```powershell
$headers = @{ "X-API-Key" = "dev-secret-key-123" }
$body = @{
  prompt = "my email is test@example.com"
  user_id = "demo"
  max_tokens = 80
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/v1/chat" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

## Theme Support

The dashboard supports polished light and dark themes:

- The initial theme respects the operating system preference.
- A visible theme toggle is available in the header.
- User preference is saved to `localStorage` as `tokenledger-theme`.
- Theme tokens are defined in `frontend/src/app/globals.css`.
- Cards, tables, forms, badges, charts, sidebar, and headers are theme-aware.

## Screenshots

Add current screenshots here after running the local dashboard:

- Dashboard overview
- Chat playground and pipeline trace
- Audit log table
- Light mode
- Dark mode

## Deployment Notes

Backend services can be deployed separately from the frontend. For a hosted frontend, set:

```env
TOKENLEDGER_BACKEND=https://your-backend-url
TOKENLEDGER_API_KEY=your-server-side-demo-key
```

For hosted backends, do not point `MCP_SERVER_URL` at `127.0.0.1` unless the MCP server runs in the same environment. Deploy MCP separately and set a reachable URL.

## Known Limitations and Future Improvements

- Migrations are manual SQL files; there is no migration runner yet.
- MCP failures are intentionally non-fatal, so tool context may be skipped when MCP is unavailable.
- Ollama is local by default; hosted semantic cache and corpus indexing need a reachable embedding service.
- The demo API key is suitable for local demos only. Production should use real user auth and scoped backend tokens.
- The frontend currently shows operational data from existing backend endpoints; richer drill-down views can be added as backend analytics expand.

## Important Points

- TokenLedger turns scattered LLM calls into a governed gateway.
- PII scanning happens before model calls.
- Cost, latency, cache, model choice, and MCP tool calls are visible in the request trace.
- Audit rows prove both allowed and blocked outcomes.
- The dashboard is built for live infrastructure demos, not static screenshots.
