import { proxyToBackend } from "@/lib/tokenledger-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") || "cost";
  const days = searchParams.get("days") || "7";

  return proxyToBackend({
    path: "/v1/dashboard/timeseries",
    params: { metric, days },
  });
}
