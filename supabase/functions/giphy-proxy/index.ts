import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const key = Deno.env.get("GIPHY_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "GIPHY is not configured yet. Add GIPHY_API_KEY in Supabase Edge Function Secrets." }), { status: 503, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
    const endpoint = q ? "search" : "trending";
    const params = new URLSearchParams({ api_key: key, limit: "24", rating: "pg-13", bundle: "messaging_non_clips" });
    if (q) params.set("q", q);
    const upstream = await fetch("https://api.giphy.com/v1/gifs/" + endpoint + "?" + params.toString());
    const payload = await upstream.json();
    if (!upstream.ok) return new Response(JSON.stringify({ error: "GIPHY request failed", status: upstream.status }), { status: upstream.status === 429 ? 429 : 502, headers: cors });
    return new Response(JSON.stringify({ data: payload.data || [] }), { status: 200, headers: { ...cors, "Cache-Control": "public, max-age=30" } });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "GIF service temporarily unavailable." }), { status: 500, headers: cors });
  }
});