import json
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter
from app.db import get_db

router = APIRouter()


def _json_list(value: Any) -> Any:
    if value is None:
        return []
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if parsed is not None else []
        except json.JSONDecodeError:
            return value
    return value


def _serialize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _model_used(row: Any) -> str | None:
    model = row["model_used"]
    if row["outcome"] == "blocked" and (not model or model == "unknown"):
        return "blocked"
    if not model or model == "unknown":
        return "unrouted"
    return model


@router.get("/audit")
async def get_audit(limit: int = 20):
    limit = max(1, min(limit, 100))

    async with get_db() as conn:
        cur = await conn.execute(
            """
            SELECT
              a.id,
              a.request_id,
              a.user_id,
              a.prompt_redacted,
              a.pii_flags,
              a.outcome,
              a.created_at,
              r.model_used,
              r.cache_hit,
              r.route_reason,
              r.cost_myr,
              r.latency_ms,
              r.tool_calls
            FROM audit_log a
            LEFT JOIN request_log r ON r.id = a.request_id
            ORDER BY a.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = await cur.fetchall()

    audit_log = []
    for row in rows:
        audit_log.append(
            {
                "id": row["id"],
                "request_id": row["request_id"],
                "user_id": row["user_id"],
                "prompt_redacted": row["prompt_redacted"],
                "pii_flags": _json_list(row["pii_flags"]),
                "outcome": row["outcome"],
                "created_at": _serialize(row["created_at"]),
                "model_used": _model_used(row),
                "cache_hit": row["cache_hit"],
                "route_reason": row["route_reason"],
                "cost_myr": _serialize(row["cost_myr"]),
                "latency_ms": row["latency_ms"],
                "tool_calls": _json_list(row["tool_calls"]),
            }
        )

    return {"audit_log": audit_log, "count": len(audit_log)}
