"""
Writes to request_log and audit_log tables.
Called at the end of every request, success or failure.
"""
import hashlib
import json
from app.db import get_db
from app.models.chat import PipelineTrace


def _hash_prompt(prompt: str) -> str:
    return hashlib.sha256(prompt.encode()).hexdigest()[:16]


async def log_request(
    prompt: str,
    trace: PipelineTrace,
    user_id: str = "anonymous",
    pii_flags: list[str] | None = None,
    outcome: str = "allowed",
    prompt_redacted: str | None = None,
) -> int | None:
    """
    Writes one row to request_log and one row to audit_log.
    Returns the request_log id.
    """
    pii_flags = pii_flags or []
    prompt_redacted = prompt_redacted or prompt

    try:
        async with get_db() as conn:
            # Write to request_log
            cur = await conn.execute(
                """
                INSERT INTO request_log
                  (prompt_hash, model_used, input_tokens, output_tokens,
                   cost_myr, latency_ms, cache_hit, route_reason, tool_calls)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    _hash_prompt(prompt),
                    trace.model_used or "unknown",
                    trace.input_tokens,
                    trace.output_tokens,
                    trace.cost_myr,
                    trace.latency_ms,
                    trace.cache_hit,
                    trace.route_reason,
                    json.dumps(trace.tool_calls),
                ),
            )
            row = await cur.fetchone()
            request_id = row["id"] if row else None

            # Write to audit_log
            await conn.execute(
                """
                INSERT INTO audit_log
                  (request_id, user_id, prompt_redacted, pii_flags, outcome)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    request_id,
                    user_id,
                    prompt_redacted,
                    json.dumps(pii_flags),
                    outcome,
                ),
            )

            return request_id

    except Exception as e:
        # Audit log failure must never crash the gateway
        import structlog
        structlog.get_logger().error("audit.write_failed", error=str(e))
        return None
