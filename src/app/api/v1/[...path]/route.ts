import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// fetch() decodes gzip/br bodies, so the upstream encoding and length no longer describe what we send.
const STALE_RESPONSE_HEADERS = ["set-cookie", "content-encoding", "content-length", "transfer-encoding", "connection"];

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`${process.env.API_URL || "http://127.0.0.1:4010"}/api/v1/${path.join("/")}`);
  target.search = new URL(request.url).search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch (error) {
    console.error(`[api-proxy] ${request.method} ${target.pathname} backend'e ulaşılamadı`, error);
    return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "Sunucuya şu an ulaşılamıyor." } }, { status: 502 });
  }
  if (response.status >= 500) console.error(`[api-proxy] ${request.method} ${target.pathname} -> HTTP ${response.status}`);
  const outbound = new Headers(response.headers);
  for (const name of STALE_RESPONSE_HEADERS) outbound.delete(name);
  const next = new Response(response.body, { status: response.status, headers: outbound });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const cookie of cookies) next.headers.append("set-cookie", cookie);
  return next;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
