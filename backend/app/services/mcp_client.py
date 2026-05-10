"""
MCP client stub — implemented Monday.
Returns None for all tool calls so the gateway works today without the MCP server.
"""

MCP_TOOL_TRIGGERS = []  # empty — no triggers today


async def call_mcp_tool(tool_name: str, arguments: dict) -> str | None:
    return None  # stub