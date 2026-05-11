CURRENCY_TOOL_NAMES = {"get_cost_summary", "check_budget_limit"}


def format_tool_result(tool_name: str, text: str) -> str:
    if tool_name not in CURRENCY_TOOL_NAMES:
        return text

    return (
        "Currency note: MYR means Malaysian ringgit. "
        "All numeric fields ending in _myr are ringgit amounts and should be "
        "reported as RM or MYR, not as millions.\n"
        f"{text}"
    )
