# TokenLedger 2-Minute Demo Script

## 1. Dashboard Overview

Open `http://localhost:3000/`. Point out cost today, requests today, cache hit rate, p95 latency, model usage, playground, and the audit log.

## 2. Normal Prompt

Submit:

```txt
Give me a short explanation of TokenLedger
```

Show the response and pipeline trace: model used, route reason, tokens, MYR cost, and latency.

## 3. PII Block

Submit:

```txt
my email is test@example.com
```

Show that the request is blocked with `pii_detected` and no model response is generated.

## 4. Cache Hit

Repeat the normal prompt. Show `cache_hit=true`, model `cache`, lower latency, and zero model cost.

## 5. Router Example

Submit a longer or more complex prompt that should route differently if the router rules are configured for it. Show `route_reason` in the trace.

## 6. MCP @cost Example

Submit:

```txt
@cost give me this week's AI spend
```

If the MCP server is running, show `get_cost_summary` in `trace.tool_calls`.

## 7. Audit Log Proof

Scroll to the audit table. Show allowed and blocked outcomes, redacted prompt text, cost, latency, route reason, and tool calls.
