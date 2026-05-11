from app.services.mcp_format import format_tool_result


def test_budget_tool_context_marks_myr_as_ringgit():
    result = format_tool_result(
        "check_budget_limit",
        '{"monthly_cap_myr": 500.0, "spent_myr": 42.5, "remaining_myr": 457.5}',
    )

    assert "MYR means Malaysian ringgit" in result
    assert "reported as RM or MYR" in result
    assert "not as millions" in result
    assert "monthly_cap_myr" in result


def test_non_currency_tool_context_is_unchanged():
    result = format_tool_result("search_internal_docs", "Policy text")

    assert result == "Policy text"
