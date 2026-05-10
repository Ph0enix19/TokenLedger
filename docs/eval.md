# Evaluation Notes

TokenLedger currently uses manual smoke tests and demo prompts. This document is a place to record repeatable results without inventing benchmark numbers.

## What Is Measured

- PII and secret blocking behavior
- Normal chat success
- Cache hit behavior on repeated prompts
- Router trace behavior
- MCP tool-call trace behavior
- Dashboard stats correctness after requests
- Audit log completeness

## Manual Test Prompts

| Case | Prompt | Expected Behavior | Result | Notes |
| --- | --- | --- | --- | --- |
| Normal request | `Give me a short explanation of TokenLedger` | HTTP 200 with response and trace |  |  |
| PII block | `my email is test@example.com` | HTTP 400 with `pii_detected` and `EMAIL` flag |  |  |
| Cache hit | Repeat the normal request | HTTP 200 with `trace.cache_hit=true` if semantic cache is active |  |  |
| Cost MCP | `@cost give me this week's AI spend` | Request succeeds; `trace.tool_calls` includes `get_cost_summary` when MCP is running |  |  |
| Docs MCP | `@docs what is the remote work policy?` | Request succeeds; `trace.tool_calls` includes `search_internal_docs` when MCP and indexed docs are available |  |  |
| Budget MCP | `@budget are we over the AI budget this month?` | Request succeeds; `trace.tool_calls` includes `check_budget_limit` when MCP is running |  |  |

## Dashboard Checks

| Check | Expected Behavior | Result | Notes |
| --- | --- | --- | --- |
| Stats cards | Cards show numbers or zeroes without crashing |  |  |
| Model chart | Shows request counts by model for last 24 hours |  |  |
| Playground trace | Shows model, route, cache, token, cost, latency, and tool fields |  |  |
| Audit polling | Table refreshes roughly every 5 seconds |  |  |
| Empty database | Stats return zeroes and audit returns an empty list |  |  |

## Notes

Do not claim accuracy, latency, or cost improvements until results are measured and recorded here.
