"""
Cost calculation from token counts.
Prices hardcoded from Groq console — fetched 2026-05-09.
In production, pull from billing API and cache with TTL.
"""
from app.config import get_settings

settings = get_settings()

PRICING_USD_PER_1K: dict[str, tuple[float, float]] = {
    settings.small_model: (settings.small_model_input_usd, settings.small_model_output_usd),
    settings.large_model: (settings.large_model_input_usd, settings.large_model_output_usd),
}


def calculate_cost_myr(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Returns estimated cost in Malaysian Ringgit.
    Falls back to small model pricing if model not in table.
    """
    pin, pout = PRICING_USD_PER_1K.get(model, (settings.small_model_input_usd, settings.small_model_output_usd))
    usd = (input_tokens / 1000) * pin + (output_tokens / 1000) * pout
    return round(usd * settings.usd_to_myr, 6)