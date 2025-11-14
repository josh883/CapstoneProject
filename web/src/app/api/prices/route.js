import { buildApiUrl } from "../../lib/apiClient";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const functionParam = searchParams.get("function");
  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval");

  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") ?? "http";
  const backendUrl = new URL(
    buildApiUrl("/prices", { host: hostHeader, protocol })
  );
  backendUrl.searchParams.set("function", functionParam);
  backendUrl.searchParams.set("symbol", symbol);
  if (interval) backendUrl.searchParams.set("interval", interval);

  const res = await fetch(backendUrl, { cache: "no-store" });
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
