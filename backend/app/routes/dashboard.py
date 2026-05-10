from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException
from app.db import get_db

router = APIRouter()


def _num(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


@router.get("/dashboard/stats")
async def get_stats():
    async with get_db() as conn:
        today_cur = await conn.execute(
            """
            SELECT
              COALESCE(SUM(cost_myr), 0) AS cost_today_myr,
              COUNT(*) AS requests_today
            FROM request_log
            WHERE created_at::date = CURRENT_DATE
            """,
            (),
        )
        today = await today_cur.fetchone()

        cache_cur = await conn.execute(
            """
            SELECT
              COUNT(*) AS total_requests,
              COUNT(*) FILTER (WHERE cache_hit = true) AS cache_hits
            FROM request_log
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            """,
            (),
        )
        cache = await cache_cur.fetchone()

        latency_cur = await conn.execute(
            """
            SELECT COALESCE(
              percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms),
              0
            ) AS p95
            FROM request_log
            WHERE created_at >= NOW() - INTERVAL '24 hours'
              AND latency_ms IS NOT NULL
            """,
            (),
        )
        latency = await latency_cur.fetchone()

        model_cur = await conn.execute(
            """
            SELECT model_used AS model, COUNT(*) AS requests
            FROM request_log
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY model_used
            ORDER BY requests DESC, model_used ASC
            """,
            (),
        )
        model_rows = await model_cur.fetchall()

    total_requests = int(cache["total_requests"] or 0)
    cache_hits = int(cache["cache_hits"] or 0)
    cache_hit_rate = (cache_hits / total_requests * 100) if total_requests else 0.0

    return {
        "cost_today_myr": round(_num(today["cost_today_myr"]), 6),
        "requests_today": int(today["requests_today"] or 0),
        "cache_hit_rate_pct_24h": round(cache_hit_rate, 1),
        "p95_latency_ms_24h": int(round(_num(latency["p95"]))),
        "requests_by_model_24h": [
            {
                "model": row["model"] or "unknown",
                "requests": int(row["requests"] or 0),
            }
            for row in model_rows
        ],
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/dashboard/timeseries")
async def get_timeseries(metric: str = "cost", days: int = 7):
    metric = metric.lower()
    days = max(1, min(days, 30))

    if metric not in {"cost", "requests", "cache_hit_rate"}:
        raise HTTPException(
            status_code=400,
            detail="metric must be one of: cost, requests, cache_hit_rate",
        )

    if metric == "cost":
        value_sql = "COALESCE(daily.cost_myr, 0)"
        aggregate_sql = """
            SELECT created_at::date AS day, SUM(cost_myr) AS cost_myr
            FROM request_log
            WHERE created_at::date >= CURRENT_DATE - (%s::int - 1)
            GROUP BY created_at::date
        """
    elif metric == "requests":
        value_sql = "COALESCE(daily.requests, 0)"
        aggregate_sql = """
            SELECT created_at::date AS day, COUNT(*) AS requests
            FROM request_log
            WHERE created_at::date >= CURRENT_DATE - (%s::int - 1)
            GROUP BY created_at::date
        """
    else:
        value_sql = """
            CASE
              WHEN COALESCE(daily.requests, 0) = 0 THEN 0
              ELSE daily.cache_hits::float / daily.requests * 100
            END
        """
        aggregate_sql = """
            SELECT
              created_at::date AS day,
              COUNT(*) AS requests,
              COUNT(*) FILTER (WHERE cache_hit = true) AS cache_hits
            FROM request_log
            WHERE created_at::date >= CURRENT_DATE - (%s::int - 1)
            GROUP BY created_at::date
        """

    query = f"""
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - (%s::int - 1),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        ),
        daily AS (
          {aggregate_sql}
        )
        SELECT days.day AS date, {value_sql} AS value
        FROM days
        LEFT JOIN daily ON daily.day = days.day
        ORDER BY days.day ASC
    """

    async with get_db() as conn:
        cur = await conn.execute(query, (days, days))
        rows = await cur.fetchall()

    return {
        "metric": metric,
        "days": days,
        "points": [
            {
                "date": row["date"].isoformat(),
                "value": round(_num(row["value"]), 6),
            }
            for row in rows
        ],
    }
