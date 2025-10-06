import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const upstream = `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/prices?${searchParams}`;
  const res = await fetch(upstream, { cache: "no-store" });
  const data = await res.json();
  return res.ok
    ? NextResponse.json(data)
    : NextResponse.json({ error: data?.detail || "Upstream error" }, { status: 500 });
}
