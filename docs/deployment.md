# Deployment Notes

## Backend on Render

Create a Render web service for the FastAPI backend.

- Root directory: `backend`
- Build command: `grep -v '^pywin32==' requirements.txt > /tmp/requirements-linux.txt && pip install -r /tmp/requirements-linux.txt`
- Start command: `python run.py --host 0.0.0.0 --no-reload`
- Required env vars:
  - `GROQ_API_KEY`
  - `DATABASE_URL`
  - `API_KEY`
  - `MCP_SERVER_URL`
  - `FALLBACK_TO_SQLITE=false`
  - `ENVIRONMENT=production`

Use a managed Postgres instance with pgvector support. Apply `migrations/001_init.sql` manually before sending traffic.

## Frontend on Vercel

Create a Vercel project from `frontend/`.

- Build command: `npm run build`
- Framework preset: Next.js
- Env vars:
  - `TOKENLEDGER_BACKEND=https://<your-render-backend>`
  - `TOKENLEDGER_API_KEY=<demo-api-key>`

The frontend proxies requests through Next API routes so the demo API key stays server-side. For production, replace the demo key with real user auth and a scoped backend token.

## MCP Server

The MCP server can be deployed as a separate Render web service.

- Root directory: `mcp_server`
- Build command: `pip install -r requirements.txt`
- Start command: `python server.py`
- Required env var:
  - `DATABASE_URL`

Set backend `MCP_SERVER_URL` to the deployed MCP service URL.

## Local vs Hosted MCP

For local demos, `MCP_SERVER_URL=http://127.0.0.1:8001` is fine.

For deployed backends, `127.0.0.1` points at the backend container, not your laptop. If the hosted backend cannot reach MCP, `@cost`, `@docs`, and `@budget` gracefully skip tool context because the gateway MCP client is non-fatal.

## Ollama and Embeddings

Local cache and corpus indexing expect Ollama at `http://localhost:11434` with:

```powershell
ollama pull nomic-embed-text
```

A hosted backend will not have local Ollama unless you deploy or configure a reachable embedding service.
