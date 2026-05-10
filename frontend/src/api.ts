/// <reference types="vite/client" />

const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const API_KEY = import.meta.env.VITE_API_KEY ?? "dev-secret-key-123";

export type ModelUsage = {
  model: string;
  requests: number;
};

export type DashboardStats = {
  cost_today_myr: number;
  requests_today: number;
  cache_hit_rate_pct_24h: number;
  p95_latency_ms_24h: number;
  requests_by_model_24h: ModelUsage[];
  last_updated: string;
};

export type ToolCall = {
  tool?: string;
  trigger?: string;
  [key: string]: unknown;
};

export type PipelineTrace = {
  pii_detected: boolean;
  pii_flags: string[];
  cache_hit: boolean;
  model_used: string;
  route_reason: string;
  input_tokens: number;
  output_tokens: number;
  cost_myr: number;
  latency_ms: number;
  tool_calls: ToolCall[];
};

export type ChatResponse = {
  response: string;
  trace: PipelineTrace;
  request_id?: number;
  timestamp?: string;
};

export type AuditEntry = {
  id: number;
  request_id: number | null;
  user_id: string | null;
  prompt_redacted: string | null;
  pii_flags: string[];
  outcome: string | null;
  created_at: string;
  model_used: string | null;
  cache_hit: boolean | null;
  route_reason: string | null;
  cost_myr: number | null;
  latency_ms: number | null;
  tool_calls: ToolCall[];
};

type AuditResponse = {
  audit_log: AuditEntry[];
  count: number;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.detail ?? payload;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.error
          ? `${detail.error}: ${detail.detail ?? "request failed"}`
          : `Request failed with HTTP ${response.status}`;
    throw new ApiError(response.status, message, detail);
  }

  return payload as T;
}

export async function fetchStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/v1/dashboard/stats`);
  return parseResponse<DashboardStats>(response);
}

export async function fetchAudit(limit = 20): Promise<AuditResponse> {
  const response = await fetch(`${API_URL}/v1/audit?limit=${limit}`);
  return parseResponse<AuditResponse>(response);
}

export async function postChat(prompt: string, maxTokens: number): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      prompt,
      user_id: "dashboard",
      max_tokens: maxTokens,
    }),
  });

  return parseResponse<ChatResponse>(response);
}

export function apiErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = error.detail as { pii_flags?: string[] } | undefined;
    const flags = detail?.pii_flags?.length ? ` (${detail.pii_flags.join(", ")})` : "";
    return `${error.message}${flags}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected API error";
}
