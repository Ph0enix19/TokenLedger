from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = "anonymous"
    max_tokens: Optional[int] = 1024


class PipelineTrace(BaseModel):
    pii_detected: bool = False
    pii_flags: list[str] = []
    cache_hit: bool = False
    model_used: str = ""
    route_reason: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_myr: float = 0.0
    latency_ms: int = 0
    tool_calls: list[dict] = []


class ChatResponse(BaseModel):
    response: str
    trace: PipelineTrace
    request_id: Optional[int] = None
    timestamp: datetime = datetime.utcnow()


class ErrorResponse(BaseModel):
    error: str
    detail: str
    pii_flags: list[str] = []