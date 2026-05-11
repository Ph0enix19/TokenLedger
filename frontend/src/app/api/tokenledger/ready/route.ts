import { proxyToBackend } from "@/lib/tokenledger-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend({ path: "/ready" });
}
