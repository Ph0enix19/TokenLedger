"""
POST /v1/chat — the main gateway endpoint.

Pipeline (today's version):
  1. Validate API key
  2. PII / secret detection  → block if found
  3. [Cache check stub]      → always miss today, wired Sunday
  4. [Model router stub]     → always small model today, wired Sunday
  5. LLM call (Groq)
  6. Cost calculation
  7. Audit log write
  8. Return response + trace
"""
import time
from fastapi import APIRouter, Header, HTTPException, status
from app.config import get_settings
from app.models.chat import ChatRequest, ChatResponse, ErrorResponse, PipelineTrace
from app.middleware.pii_detector import detect_and_redact
from app.services.llm import call_llm
from app.services.cost import calculate_cost_myr
from app.services.audit import log_request

router = APIRouter()
settings = get_settings()


def _verify_api_key(x_api_key: str | None) -> None:
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorResponse, "description": "PII or secret detected"},
        401: {"description": "Invalid API key"},
    },
)
async def chat(
    request: ChatRequest,
    x_api_key: str | None = Header(default=None),
):
    _verify_api_key(x_api_key)

    t_total_start = time.perf_counter()
    trace = PipelineTrace()

    # ── Step 1: PII detection ──────────────────────────────────────────
    redacted_prompt, pii_matches = detect_and_redact(request.prompt)
    if pii_matches:
        flags = [m.pattern_name for m in pii_matches]
        trace.pii_detected = True
        trace.pii_flags = flags

        # Log the blocked attempt before returning
        await log_request(
            prompt=request.prompt,
            trace=trace,
            user_id=request.user_id,
            pii_flags=flags,
            outcome="blocked",
            prompt_redacted=redacted_prompt,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "pii_detected",
                "detail": "Request blocked: prompt contains sensitive data",
                "pii_flags": flags,
            },
        )

    # ── Step 2: Semantic cache (stub — always miss today) ─────────────
    trace.cache_hit = False

    # ── Step 3: Model routing (stub — always small model today) ───────
    model = settings.small_model
    trace.model_used = model
    trace.route_reason = "default_stub_saturday"

    # ── Step 4: LLM call ──────────────────────────────────────────────
    llm_result = await call_llm(
        prompt=request.prompt,
        model=model,
        max_tokens=request.max_tokens,
    )

    trace.input_tokens = llm_result["input_tokens"]
    trace.output_tokens = llm_result["output_tokens"]
    trace.latency_ms = llm_result["latency_ms"]

    # ── Step 5: Cost calculation ───────────────────────────────────────
    trace.cost_myr = calculate_cost_myr(
        model=model,
        input_tokens=trace.input_tokens,
        output_tokens=trace.output_tokens,
    )

    # ── Step 6: Total latency ─────────────────────────────────────────
    trace.latency_ms = int((time.perf_counter() - t_total_start) * 1000)

    # ── Step 7: Audit log ─────────────────────────────────────────────
    request_id = await log_request(
        prompt=request.prompt,
        trace=trace,
        user_id=request.user_id,
        pii_flags=[],
        outcome="allowed",
        prompt_redacted=request.prompt,
    )

    return ChatResponse(
        response=llm_result["response"],
        trace=trace,
        request_id=request_id,
    )