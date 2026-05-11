import type {
  AuditResponse,
  ChatRequestPayload,
  ChatResponse,
  DashboardStats,
  HealthResponse,
  PiiBlockPayload,
  TimeseriesResponse,
} from "@/types/tokenledger";

// Use Next.js API routes as proxy - these match the TokenLedger backend contracts
const BASE_PATH = "/api/tokenledger";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  payload: unknown;

  constructor(status: number, message: string, detail: unknown, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.payload = payload;
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorDetail(payload: unknown): unknown {
  if (isRecord(payload) && "detail" in payload) {
    return payload.detail;
  }
  return payload;
}

function errorMessage(status: number, payload: unknown): string {
  const detail = getErrorDetail(payload);
  if (typeof detail === "string") return detail;
  if (isRecord(detail)) {
    const error = typeof detail.error === "string" ? detail.error : "request_failed";
    const description =
      typeof detail.detail === "string"
        ? detail.detail
        : typeof detail.message === "string"
          ? detail.message
          : `HTTP ${status}`;
    return `${error}: ${description}`;
  }
  if (typeof payload === "string") return payload;
  return `Request failed with HTTP ${status}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, init);
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(response.status, payload), getErrorDetail(payload), payload);
  }

  return payload as T;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function getReady(): Promise<HealthResponse> {
  return request<HealthResponse>("/ready");
}

export function getDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/dashboard/stats");
}

export function getTimeseries(metric = "cost", days = 7): Promise<TimeseriesResponse> {
  const params = new URLSearchParams({ metric, days: String(days) });
  return request<TimeseriesResponse>(`/dashboard/timeseries?${params.toString()}`);
}

export function getAudit(limit = 20): Promise<AuditResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  return request<AuditResponse>(`/audit?${params.toString()}`);
}

export function sendChat(payload: ChatRequestPayload): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getPiiBlockPayload(error: unknown): PiiBlockPayload | null {
  if (!(error instanceof ApiError) || error.status !== 400 || !isRecord(error.detail)) {
    return null;
  }
  const flags = error.detail.pii_flags;
  return {
    error: typeof error.detail.error === "string" ? error.detail.error : undefined,
    detail: typeof error.detail.detail === "string" ? error.detail.detail : undefined,
    pii_flags: Array.isArray(flags) ? flags.map(String) : [],
  };
}

export function apiErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const pii = getPiiBlockPayload(error);
    const flags = pii?.pii_flags?.length ? ` (${pii.pii_flags.join(", ")})` : "";
    return `${error.message}${flags}`;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected API error";
}
