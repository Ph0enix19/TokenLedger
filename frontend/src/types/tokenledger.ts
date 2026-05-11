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

export type TimeseriesPoint = {
  date: string;
  value: number;
};

export type TimeseriesResponse = {
  metric: string;
  days: number;
  points: TimeseriesPoint[];
};

export type HealthResponse = {
  status?: string;
  service?: string;
  db?: string;
  [key: string]: unknown;
};

export type ToolCall = {
  tool?: string;
  name?: string;
  trigger?: string;
  [key: string]: unknown;
};

export type ChatTrace = {
  pii_detected: boolean;
  pii_flags: string[];
  cache_hit: boolean;
  model_used: string;
  route_reason: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_myr?: number;
  latency_ms?: number;
  tool_calls?: ToolCall[];
};

export type ChatResponse = {
  response: string;
  trace: ChatTrace;
  request_id?: number | null;
  timestamp?: string;
};

export type AuditRow = {
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

export type AuditResponse = {
  audit_log: AuditRow[];
  count: number;
};

export type ChatRequestPayload = {
  prompt: string;
  user_id: string;
  max_tokens: number;
};

export type PiiBlockPayload = {
  error?: string;
  detail?: string;
  pii_flags?: string[];
};

export type ChatInteraction =
  | {
      status: "allowed";
      prompt: string;
      user_id: string;
      max_tokens: number;
      response: ChatResponse;
      received_at: string;
    }
  | {
      status: "blocked";
      prompt: string;
      user_id: string;
      max_tokens: number;
      error: string;
      detail?: unknown;
      pii_flags: string[];
      received_at: string;
    };

export type EndpointState = "checking" | "healthy" | "ready" | "unavailable";

export type EndpointStatus = {
  state: EndpointState;
  label: string;
  detail?: string;
};
