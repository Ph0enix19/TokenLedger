# TokenLedger

Real-time cost tracking and controls for AI infrastructure.

TokenLedger is a governed AI gateway. Applications call one FastAPI endpoint, and the gateway handles API-key checks, PII blocking, model routing, semantic cache lookup, optional MCP tool context, cost calculation, and audit logging before returning the model response.

## Problem

LLM usage often spreads across scripts, prototypes, and product services before teams can answer basic operational questions: what did we spend today, which model handled a request, did sensitive data get blocked, and can we prove what happened later?

## What TokenLedger Does

- Routes chat requests through a single FastAPI gateway on port `8000`.
- Blocks prompts with detected PII or secrets before they reach the LLM.
- Tracks token usage, latency, model choice, cache hits, route reason, and MYR cost.
- Stores request and audit rows in Postgres with pgvector support.
- Uses Ollama embeddings locally for semantic cache and corpus indexing.
- Calls a separate MCP server on port `8001` for governed internal tools.
- Provides a React dashboard for live metrics, chat playground, pipeline trace, and audit review.

## Architecture

```mermaid
flowchart LR
  A[Client Dashboard] --> B[FastAPI Gateway]
  B --> C[PII Detector]
  C --> D[Semantic Cache / Router]
  D --> E[Groq LLM]
  D --> F[MCP Server]
  F --> G[Postgres]
  D --> H[Ollama Embeddings]
  B --> G
```

The MCP server is a separate process. The gateway calls it through `MCP_SERVER_URL`; the LLM never receives database credentials.

## Current Features

- `POST /v1/chat` with `X-API-Key` protection.
- `GET /v1/audit?limit=20` with request metadata joined into audit rows.
- `GET /v1/dashboard/stats` for cost today, requests today, cache hit rate, p95 latency, and model breakdown.
- `GET /v1/dashboard/timeseries?metric=cost&days=7` for simple daily points.
- Tool triggers:
  - `@cost` calls `get_cost_summary`
  - `@docs` calls `search_internal_docs`
  - `@budget` calls `check_budget_limit`
- React + Vite + Tailwind dashboard in `frontend/`.
- Dockerfiles for backend and MCP server.
- Existing `docker-compose.yml` remains Postgres-only.
- New `docker-compose.full.yml` runs Postgres, backend, and MCP server together.

## Tech Stack

- FastAPI
- psycopg3 and psycopg-pool
- Postgres with pgvector
- Groq LLM API
- Ollama at `http://localhost:11434`
- Embedding model: `nomic-embed-text`
- MCP Python SDK
- React, Vite, TypeScript, Tailwind, Recharts

## Local Quickstart

1. Create local env files:

```powershell
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

2. Edit `backend/.env` and set a real `GROQ_API_KEY`.

3. Start Postgres:

```powershell
docker compose up -d
```

4. Apply the schema if the database is new:

```powershell
docker ps
docker exec -i <postgres_container_name> psql -U tokenledger -d tokenledger < migrations/001_init.sql
```

5. Start the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:GROQ_API_KEY="YOUR_GROQ_KEY"
$env:API_KEY="dev-secret-key-123"
$env:DATABASE_URL="postgresql://tokenledger:tokenledger@localhost:15433/tokenledger"
$env:MCP_SERVER_URL="http://127.0.0.1:8001"
python run.py
```

6. Start the MCP server:

```powershell
$env:DATABASE_URL="postgresql://tokenledger:tokenledger@localhost:15433/tokenledger"
python mcp_server/server.py
```

7. Start the dashboard:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173/`.

## PowerShell Demo Commands

Health:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"
```

Normal chat:

```powershell
$headers = @{ "X-API-Key" = "dev-secret-key-123" }
$body = @{
  prompt = "Give me a short explanation of TokenLedger"
  user_id = "demo"
  max_tokens = 120
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/v1/chat" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

PII block:

```powershell
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

Dashboard stats:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/v1/dashboard/stats"
```

Audit log:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/v1/audit?limit=10"
```

## MCP Demo Flow

Run the MCP server first, then send prompts through `/v1/chat`:

```powershell
$body = @{
  prompt = "@cost give me this week's AI spend"
  user_id = "demo"
  max_tokens = 180
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/v1/chat" `
  -Method POST `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Try `@docs what is the remote work policy?` after running `scripts/index_corpus.py`.

## Dashboard Screenshots

Placeholder: add screenshots here after capturing the local dashboard at `http://localhost:5173/`.

## Evaluation Summary

See [docs/eval.md](docs/eval.md). Current evaluation is manual smoke testing; no measured benchmark numbers are claimed in this README.

## Deployment Notes

See [docs/deployment.md](docs/deployment.md).

Key ports:

- FastAPI gateway: `8000`
- MCP server: `8001`
- Postgres through Docker on host: `15433`
- Ollama local default: `11434`

For local containers:

```powershell
docker compose -f docker-compose.full.yml up --build
```

Migrations are manual. Apply `migrations/001_init.sql` before using a fresh database.

## Known Limitations

- The demo frontend exposes `VITE_API_KEY`; that is acceptable for local demos only.
- Render or other hosted backends cannot reach `127.0.0.1:8001` on your laptop. Deploy MCP separately and set `MCP_SERVER_URL` to a reachable URL for hosted tool calls.
- Ollama is local. Deployed semantic cache and corpus indexing need a reachable embedding service.
- Migrations are manual SQL files; there is no migration runner yet.
- MCP failures are intentionally non-fatal, so tool context may be skipped when the MCP server is unavailable.

## Interview Talking Points

- TokenLedger turns AI usage into an auditable gateway instead of scattered provider calls.
- The request trace makes cost, routing, latency, cache, and tool behavior inspectable.
- PII blocking happens before model calls, reducing data exposure risk.
- MCP is isolated as a separate process with its own database access boundary.
- The dashboard proves behavior live: normal request, blocked request, cache hit, model route, and audit evidence.
