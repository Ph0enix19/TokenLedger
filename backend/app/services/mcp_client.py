"""
MCP client - calls the TokenLedger MCP server on port 8001.

The gateway is the ONLY caller of the MCP server.
The LLM never gets the MCP server URL or Postgres credentials.

Tool trigger detection:
  Prompt contains "@cost"   -> get_cost_summary(days=7)
  Prompt contains "@docs"   -> search_internal_docs(query=<rest of prompt>)
  Prompt contains "@budget" -> check_budget_limit(team="engineering")
"""
import structlog
from app.config import get_settings
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

logger = structlog.get_logger()
settings = get_settings()


async def call_mcp_tool(tool_name: str, arguments: dict) -> str | None:
    """
    Calls a tool on the MCP server.
    Returns the result as a plain string for injection into LLM context.
    Returns None on any failure - tool call failure is non-fatal.
    """
    url = f"{settings.mcp_server_url.rstrip('/')}/mcp"
    try:
        async with streamablehttp_client(url, timeout=5.0) as (
            read_stream,
            write_stream,
            _get_session_id,
        ):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments)

                if result.isError:
                    logger.warning("mcp_tool_returned_error", tool=tool_name)
                    return None

                blocks = []
                for item in result.content:
                    text = getattr(item, "text", None)
                    blocks.append(text if text else str(item))
                return "\n".join(blocks)
    except Exception as e:
        logger.warning("mcp_tool_call_failed", tool=tool_name, error=str(e))
        return None


MCP_TOOL_TRIGGERS = [
    (
        "@cost",
        "get_cost_summary",
        lambda prompt: {"days": 7},
    ),
    (
        "@docs",
        "search_internal_docs",
        lambda prompt: {"query": prompt.replace("@docs", "").strip(), "k": 3},
    ),
    (
        "@budget",
        "check_budget_limit",
        lambda prompt: {"team": "engineering"},
    ),
]
