/* Cloudflare Pages Function: GET/POST /api/search?q=...
   NetEase Cloud Music search. Spoofs a CN client IP (X-Real-IP) so requests
   from Cloudflare's edge aren't geo-filtered to empty results. */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CN_IP = "118.88.88.88";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "Content-Type": "application/json", ...CORS } });
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

async function handle(query) {
  if (!query) return json({ error: "请提供搜索关键词" }, 400);
  // NOTE: the /web endpoint returns an encrypted "abroad" payload from
  // datacenter IPs (Cloudflare/Vercel). The plain /get endpoint returns normal
  // JSON with results even from overseas egress.
  const u = new URL("https://music.163.com/api/search/get");
  u.searchParams.set("s", query);
  u.searchParams.set("type", "1");
  u.searchParams.set("limit", "10");
  const res = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Referer: "https://music.163.com", Cookie: "appver=8.0.0; os=pc", "X-Real-IP": CN_IP, "X-Forwarded-For": CN_IP },
  });
  if (!res.ok) return json({ error: "搜索失败: " + res.status }, 502);
  const data = await res.json();
  const songs = (data && data.result && data.result.songs) || [];
  return json({
    songs: songs.map((s) => ({
      id: s.id,
      name: s.name,
      artists: (s.artists || []).map((a) => a.name).join(", "),
      album: (s.album && s.album.name) || "",
      durationMs: s.duration || 0,
    })),
  });
}

export async function onRequestGet(context) {
  const q = new URL(context.request.url).searchParams.get("q") || "";
  return handle(q.trim());
}
export async function onRequestPost(context) {
  const b = await context.request.json().catch(() => ({}));
  return handle((b.query || "").trim());
}
