"""
TokenLedger MCP Server

Exposes 3 governed tools to the gateway:
  - get_cost_summary: trailing N-day AI spend from request_log
  - search_internal_docs: keyword search over indexed corpus
  - check_budget_limit: monthly spend vs cap for a team

Architecture principle:
  The LLM calls tools through the gateway -> gateway calls this server.
  This server is the ONLY process with Postgres credentials for these ops.
  Every tool call is logged. The LLM never sees a connection string.

Run: python mcp_server/server.py
Port: 8001 (streamable-http transport)
"""
import os
from datetime import datetime, timedelta
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row
from mcp.server.fastmcp import FastMCP
import structlog

logger = structlog.get_logger()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tokenledger:tokenledger@127.0.0.1:5433/tokenledger",
)

mcp = FastMCP(
    name="TokenLedger",
    instructions=(
        "Internal tool server for TokenLedger gateway. "
        "Use get_cost_summary for AI spend questions, "
        "search_internal_docs for company policy questions, "
        "check_budget_limit for budget status questions."
    ),
    host="0.0.0.0",
    port=8001,
)


class ModelBreakdown(BaseModel):
    model: str
    requests: int
    total_cost_myr: float


class CostSummary(BaseModel):
    period_days: int
    total_requests: int
    total_cost_myr: float
    cache_hits: int
    cache_hit_rate_pct: float
    by_model: list[ModelBreakdown]


class DocHit(BaseModel):
    source: str
    chunk: str


class BudgetStatus(BaseModel):
    team: str
    monthly_cap_myr: float
    spent_myr: float
    remaining_myr: float
    status: str


TEAM_BUDGETS = {
    "engineering": 500.0,
    "product": 200.0,
    "data": 300.0,
    "default": 100.0,
}


def _db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=5)


@mcp.tool()
async def get_cost_summary(days: int = 7) -> CostSummary:
    """
    Returns total AI infrastructure cost in MYR, per-model breakdown,
    and cache statistics for the trailing N days.
    Use this to answer any question about AI spend, cost, or usage.
    """
    logger.info("mcp.get_cost_summary", days=days)
    since = datetime.utcnow() - timedelta(days=days)

    conn = _db()
    try:
        cur = conn.execute(
            """
            SELECT
                COUNT(*) as total_requests,
                COALESCE(SUM(cost_myr), 0) as total_cost,
                COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits
            FROM request_log WHERE created_at >= %s
            """,
            (since,),
        )
        totals = cur.fetchone()

        cur = conn.execute(
            """
            SELECT model_used, COUNT(*) as requests,
                   COALESCE(SUM(cost_myr), 0) as total_cost
            FROM request_log WHERE created_at >= %s
            GROUP BY model_used ORDER BY total_cost DESC
            """,
            (since,),
        )
        model_rows = cur.fetchall()
    finally:
        conn.close()

    total_req = int(totals["total_requests"] or 0)
    total_cost = float(totals["total_cost"] or 0)
    cache_hits = int(totals["cache_hits"] or 0)
    hit_rate = (cache_hits / total_req * 100) if total_req > 0 else 0.0

    return CostSummary(
        period_days=days,
        total_requests=total_req,
        total_cost_myr=round(total_cost, 4),
        cache_hits=cache_hits,
        cache_hit_rate_pct=round(hit_rate, 1),
        by_model=[
            ModelBreakdown(
                model=r["model_used"],
                requests=int(r["requests"]),
                total_cost_myr=round(float(r["total_cost"]), 4),
            )
            for r in model_rows
        ],
    )


@mcp.tool()
async def search_internal_docs(query: str, k: int = 3) -> list[DocHit]:
    """
    Searches Acme Corp internal documents (policies, runbooks, OKRs).
    Returns the top-k most relevant chunks.
    Use this for questions about company policy, on-call, expenses, or deployments.
    """
    logger.info("mcp.search_internal_docs", query=query)

    conn = _db()
    try:
        cur = conn.execute(
            """
            SELECT source, chunk FROM documents
            WHERE LOWER(chunk) LIKE %s
            LIMIT %s
            """,
            (f"%{query.lower()}%", k),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return [DocHit(source="no_results", chunk=f"No documents found for: {query}")]

    return [DocHit(source=r["source"], chunk=r["chunk"]) for r in rows]


@mcp.tool()
async def check_budget_limit(team: str = "engineering") -> BudgetStatus:
    """
    Returns the current month's AI spend vs budget cap for the specified team.
    Use this for questions like 'are we over budget?' or 'how much AI budget is left?'
    Valid team names: engineering, product, data.
    """
    logger.info("mcp.check_budget_limit", team=team)

    cap = TEAM_BUDGETS.get(team.lower(), TEAM_BUDGETS["default"])
    month_start = datetime.utcnow().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    conn = _db()
    try:
        cur = conn.execute(
            "SELECT COALESCE(SUM(cost_myr), 0) as spent FROM request_log WHERE created_at >= %s",
            (month_start,),
        )
        row = cur.fetchone()
    finally:
        conn.close()

    spent = float(row["spent"] or 0)
    remaining = cap - spent

    if spent >= cap:
        status = "exceeded"
    elif spent >= cap * 0.8:
        status = "warning"
    else:
        status = "ok"

    return BudgetStatus(
        team=team,
        monthly_cap_myr=cap,
        spent_myr=round(spent, 4),
        remaining_myr=round(remaining, 4),
        status=status,
    )


if __name__ == "__main__":
    logger.info("mcp_server.starting", transport="streamable-http", port=8001)
    mcp.run(transport="streamable-http")
