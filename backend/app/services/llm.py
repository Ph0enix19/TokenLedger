"""
Groq LLM client wrapper.
Handles the actual model call and returns a normalised result.
"""
import time
from groq import AsyncGroq
from app.config import get_settings

settings = get_settings()
_client: AsyncGroq | None = None

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI assistant for an engineering team. "
    "For TokenLedger cost and budget answers, MYR means Malaysian ringgit "
    "and fields ending in _myr are currency amounts, not values in millions. "
    "Format currency as RM <amount> or MYR <amount>."
)


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def call_llm(
    prompt: str,
    model: str,
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    max_tokens: int = 1024,
) -> dict:
    """
    Calls the Groq API and returns a dict with:
    response, input_tokens, output_tokens, latency_ms
    """
    client = get_groq_client()
    t0 = time.perf_counter()

    completion = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
    )

    latency_ms = int((time.perf_counter() - t0) * 1000)
    message = completion.choices[0].message.content or ""
    usage = completion.usage

    return {
        "response": message,
        "input_tokens": usage.prompt_tokens if usage else 0,
        "output_tokens": usage.completion_tokens if usage else 0,
        "latency_ms": latency_ms,
    }
