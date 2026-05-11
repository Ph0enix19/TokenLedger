import { proxyToBackend } from "@/lib/tokenledger-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "20";

  return proxyToBackend({
    path: "/v1/audit",
    params: { limit },
  });
}
