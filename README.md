# TokenLedger

TokenLedger is an AI gateway and observability dashboard for governed LLM usage. Applications send prompts through one FastAPI endpoint, and TokenLedger adds API-key checks, PII blocking, heuristic model routing, semantic cache lookup, optional MCP tool context, cost calculation, and audit logging before returning a response.

## Why I Built This

AI apps can become expensive and hard to audit when every feature calls model APIs directly. TokenLedger explores a control-plane approach: route requests through one gateway so teams can see cost, latency, model choice, cache behavior, sensitive-data blocks, and internal-tool context in one place.

## Features

- FastAPI gateway with `POST /v1/chat`.
- API-key protection through `X-API-Key`.
- PII and secret detection before model calls.
- Blocked requests are logged and returned as HTTP 400.
- Heuristic model routing between small and large Groq models.
- Groq LLM calls with token usage and latency capture.
- Cost calculation in MYR from input/output tokens.
- Postgres request log and audit log.
- Semantic cache hooks using Ollama `nomic-embed-text` embeddings and `cache_entries`.
- MCP tool context triggered by:
  - `@cost` for trailing cost summaries
  - `@docs` for internal document search
  - `@budget` for budget status
- Next.js dashboard with status cards, model/cost charts, chat playground, pipeline trace, audit table, request details, and light/dark themes.
- Docker Compose setup for Postgres with pgvector.

## Tech Stack

- **Backend:** Python, FastAPI, Pydantic, psycopg3, psycopg-pool, structlog, Groq SDK
- **Database:** PostgreSQL with pgvector
- **Cache / embeddings:** Ollama `nomic-embed-text`, cosine similarity, `cache_entries`
- **MCP:** MCP Python SDK with a streamable HTTP server
- **Frontend:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Recharts, lucide-react
- **Infrastructure:** Docker Compose, manual SQL migration
- **Tests:** pytest tests for PII detection, docs search, and MCP formatting

## My Role / Contribution

The repo shows backend gateway work, MCP tooling, Postgres schema, Next.js dashboard, and tests. The exact individual contribution split is not visible from code alone.

- [TODO: clarify whether TokenLedger is solo work or team work]
- [TODO: clarify your strongest ownership areas: gateway, dashboard, MCP, cache, database, tests, or architecture]

## Project Structure

```text
TokenLedger/
|-- README.md
|-- .env.example
|-- docker-compose.yml
|-- docker-compose.full.yml
|-- migrations/
|   `-- 001_init.sql
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- run.py
|   |-- app/
|   |   |-- main.py
|   |   |-- config.py
|   |   |-- db.py
|   |   |-- routes/
|   |   |-- services/
|   |   `-- middleware/
|   `-- tests/
|-- frontend/
|   |-- package.json
|   |-- .env.example
|   `-- src/
|       |-- app/
|       |-- components/tokenledger/
|       |-- lib/
|       `-- types/
|-- mcp_server/
|   |-- Dockerfile
|   |-- server.py
|   |-- docs_search.py
|   `-- requirements.txt
`-- corpus/
```

## Getting Started

### Prerequisites

- Python 3.11+ [TODO: clarify exact supported Python version]
- Node.js 20+ [TODO: clarify exact supported Node version for Next 16]
- Docker Desktop
- Groq API key
- Optional Ollama with `nomic-embed-text` pulled for semantic cache behavior

### Installation

Clone the repository:

```bash
git clone https://github.com/Ph0enix19/TokenLedger.git
cd TokenLedger
```

Create backend and frontend env files:

```powershell
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

### Environment Variables

Backend:

```env
GROQ_API_KEY=your_groq_key_here
DATABASE_URL=postgresql://tokenledger:tokenledger@localhost:15433/tokenledger
FALLBACK_TO_SQLITE=false
ENVIRONMENT=development
API_KEY=dev-secret-key-123
MCP_SERVER_URL=http://127.0.0.1:8001
```

Frontend:

```env
TOKENLEDGER_BACKEND=http://127.0.0.1:8000
TOKENLEDGER_API_KEY=dev-secret-key-123
```

Keep `TOKENLEDGER_API_KEY` server-side. The Next.js frontend uses API routes as a backend-for-frontend proxy so the browser does not call the FastAPI key directly.

### Run Locally

Start Postgres:

```powershell
docker compose up -d
```

Apply the schema:

```powershell
docker compose cp migrations/001_init.sql postgres:/tmp/001_init.sql
docker compose exec -T postgres psql -U tokenledger -d tokenledger -f /tmp/001_init.sql
```

Start the MCP server:

```powershell
$env:DATABASE_URL="postgresql://tokenledger:tokenledger@localhost:15433/tokenledger"
python mcp_server/server.py
```

Start the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Quick backend checks:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"
Invoke-RestMethod "http://127.0.0.1:8000/ready"
Invoke-RestMethod "http://127.0.0.1:8000/v1/dashboard/stats"
```

## Screenshots / Demo

- [TODO: add dashboard overview screenshot]
- [TODO: add chat playground and pipeline trace screenshot]
- [TODO: add audit log screenshot]
- [TODO: add deployment link if hosted]

## Current Status

MVP / infrastructure prototype. The gateway, dashboard, audit endpoints, MCP triggers, and Postgres schema are present. The model router is heuristic, migrations are manual SQL, MCP failures are intentionally non-fatal, and the semantic cache depends on local Ollama by default.

## Future Improvements

- Add GitHub Actions for backend tests, frontend lint/build, and dependency checks.
- Add a migration runner instead of manual SQL commands.
- Add production authentication and scoped API tokens instead of a demo API key.
- Add indexed pgvector search for cache lookup at larger scale.
- Add richer analytics for per-user, per-team, and per-project cost views.
- Add hosted deployment docs for backend, MCP server, Postgres, and frontend.
- Add screenshots and demo video.

## What I Learned

- How to design an AI gateway as a control point for model calls.
- How cost, latency, cache behavior, and model routing can be made auditable.
- How PII checks can block risky prompts before they reach an LLM provider.
- How MCP tools can add governed internal context without exposing database credentials to the model.
