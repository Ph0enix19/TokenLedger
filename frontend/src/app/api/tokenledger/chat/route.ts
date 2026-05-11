import { proxyToBackend } from "@/lib/tokenledger-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  return proxyToBackend({
    path: "/v1/chat",
    method: "POST",
    body,
  });
}
