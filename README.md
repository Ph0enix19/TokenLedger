# TokenLedger

Real-time cost tracking and controls for AI infrastructure.

TokenLedger is an AI gateway that sits between application code and LLM providers. Every prompt flows through one controlled gateway where cost, latency, security checks, and audit logs are recorded before or after the model call.

## Project status

### Saturday foundation complete

Implemented:

- FastAPI backend
- Docker Compose with Postgres
- Database schema for:
  - `request_log`
  - `audit_log`
  - `cache_entries`
  - `documents`
- `/health` endpoint
- `/ready` endpoint with database check
- `POST /v1/chat`
- Groq integration using `llama-3.1-8b-instant`
- Real token usage from Groq API
- Cost calculation in MYR
- API key protection using `X-API-Key`
- PII and secret detection middleware
- Blocked requests return `400` and never reach the LLM
- Allowed and blocked requests are written to Postgres audit logs

## What TokenLedger does right now

Current request flow:

```txt
Client request
→ API key check
→ PII / secret detector
→ Groq LLM call
→ token + cost + latency calculation
→ request_log insert
→ audit_log insert
→ response