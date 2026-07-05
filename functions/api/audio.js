/* Cloudflare Pages Function: GET /api/audio?id=<songId>
   Streams the full original audio for a NetEase song id via the public
   outer-chain (share) endpoint. The browser base64-encodes the bytes for
   Gemini, so no encoding happens here.

   Why two steps (manual redirect, then explicit HTTPS re-fetch):
   `music.163.com/song/media/outer/url` 302-redirects to a plain-`http://`
   CDN URL (m*.music.126.net). Letting the Worker auto-follow (redirect:
   "follow") to an insecure http:// subrequest is unreliable from Cloudflare
   edge — some POPs drop the custom UA/Referer on the hop or refuse the http
   downgrade, yielding a tiny error body that trips the size heuristic. So we
   read the Location ourselves, upgrade http→https, and re-fetch with the
   same spoofed CN client headers. `?debug=1` returns diagnostics instead of
   the audio stream. */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CN_IP = "118.88.88.88";
const CORS = { "Access-Control-Allow-Origin": "*" };
const SPOOF = { "User-Agent": UA, Referer: "https://music.163.com", "X-Real-IP": CN_IP, "X-Forwarded-For": CN_IP };

const jsonErr = (msg, status = 404, extra = {}) =>
  new Response(JSON.stringify({ error: msg, ...extra }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export async function onRequestGet(context) {
  const reqUrl = new URL(context.request.url);
  const id = reqUrl.searchParams.get("id");
  const debug = reqUrl.searchParams.get("debug");
  if (!id) return jsonErr("缺少 id", 400);

  const outerUrl = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`;

  // Step 1 — grab the 302 target ourselves.
  let r1;
  try {
    r1 = await fetch(outerUrl, { headers: SPOOF, redirect: "manual" });
  } catch (e) {
    return jsonErr("外链请求失败", 502, { stage: "outer", detail: String(e) });
  }
  let loc = r1.headers.get("location") || "";

  // Some POPs / cases return the audio directly on the first hop (2xx audio).
  const r1ct = r1.headers.get("content-type") || "";
  const r1len = Number(r1.headers.get("content-length") || "0");
  if (r1.ok && r1ct.includes("audio") && r1len > 100000 && !loc) {
    if (debug) return jsonErr("(debug) direct-audio-on-outer", 200, { r1Status: r1.status, r1ct, r1len });
    return new Response(r1.body, { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", ...CORS } });
  }

  // NetEase points unavailable tracks at a tiny/blank redirect or a 404 page.
  if (!loc) {
    if (debug) return jsonErr("(debug) no-location", 200, { r1Status: r1.status, r1ct, r1len });
    return jsonErr("无法获取完整音频（可能受版权保护或需要会员）。请换一首。");
  }

  const cdnUrl = loc.replace(/^http:\/\//i, "https://");

  // Step 2 — fetch the real audio over HTTPS with the spoofed headers.
  let r2;
  try {
    r2 = await fetch(cdnUrl, { headers: SPOOF, redirect: "follow" });
  } catch (e) {
    return jsonErr("音频回源失败", 502, { stage: "cdn", detail: String(e), loc: cdnUrl.slice(0, 120) });
  }
  const ct = r2.headers.get("content-type") || "";
  const len = Number(r2.headers.get("content-length") || "0");

  if (debug) {
    return jsonErr("(debug) two-step", 200, {
      r1Status: r1.status,
      locHost: (() => { try { return new URL(cdnUrl).host; } catch { return "?"; } })(),
      r2Status: r2.status,
      r2ct: ct,
      r2len: len,
    });
  }

  if (!r2.ok || (!ct.includes("audio") && len < 100000)) {
    return jsonErr("无法获取完整音频（可能受版权保护或需要会员）。请换一首。");
  }

  return new Response(r2.body, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", ...CORS },
  });
}
