/**
 * Proxy utility for forwarding API requests to the real TokenLedger backend.
 *
 * Usage:
 *   - By default, proxies to http://localhost:8000 (set TOKENLEDGER_BACKEND env to override)
 *   - Automatically adds X-API-Key header from TOKENLEDGER_API_KEY env (default: dev-secret-key-123)
 *   - Preserves status codes and error bodies so the frontend handles them correctly
 *   - PII HTTP 400 responses pass through intact (no breakage)
 */

const BACKEND_URL = process.env.TOKENLEDGER_BACKEND ?? "http://localhost:8000";
const API_KEY = process.env.TOKENLEDGER_API_KEY ?? "dev-secret-key-123";

type ProxyOptions = {
  /** Backend path, e.g. "/health" or "/v1/chat" */
  path: string;
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Optional JSON body (will be stringified) */
  body?: unknown;
  /** Additional query params to append to the path */
  params?: Record<string, string | number>;
};

/**
 * Forward a request to the real TokenLedger backend.
 * Returns the raw Response object so route handlers can return it directly.
 */
export async function proxyToBackend({ path, method = "GET", body, params }: ProxyOptions): Promise<Response> {
  // Build URL with query params
  let url = `${BACKEND_URL}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    );
    url += `?${searchParams.toString()}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  let requestBody: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  // Forward the request
  const backendResponse = await fetch(url, {
    method,
    headers,
    body: requestBody,
    cache: "no-store",
  });

  // Read the response body once
  const responseText = await backendResponse.text();

  // Build a new Response with the same status and headers
  return new Response(responseText, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: {
      "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      "X-Proxied-From": BACKEND_URL,
    },
  });
}
