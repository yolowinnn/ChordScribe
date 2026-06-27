/* Cloudflare Pages Function: GET /api/audio?id=<songId>
   Streams the full original audio for a NetEase song id (public outer-url),
   spoofing a CN client IP. Streaming passthrough = minimal Worker CPU. The
   browser base64-encodes the bytes for Gemini, so no encoding happens here. */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CN_IP = "118.88.88.88";
const CORS = { "Access-Control-Allow-Origin": "*" };

export async function onRequestGet(context) {
  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "缺少 id" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });

  const url = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://music.163.com", "X-Real-IP": CN_IP, "X-Forwarded-For": CN_IP },
    redirect: "follow",
  });
  const ct = res.headers.get("content-type") || "";
  const len = Number(res.headers.get("content-length") || "0");
  if (!res.ok || (!ct.includes("audio") && len < 100000)) {
    return new Response(JSON.stringify({ error: "无法获取完整音频（可能受版权保护或需要会员）。请换一首。" }), { status: 404, headers: { "Content-Type": "application/json", ...CORS } });
  }
  return new Response(res.body, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", ...CORS },
  });
}
