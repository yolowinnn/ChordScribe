/* Vercel Serverless Function: GET /api/audio?id=<songId>
   取网易云完整音频并回传字节（浏览器再 base64 喂 Gemini）。

   为什么放 Vercel 而不是 Cloudflare：网易云对 Cloudflare 边缘 IP 段区别对待，
   同一 outer-url 从 CF 边缘取不到、从普通 IP（含 Vercel serverless 出口）能取到
   完整 MP3。Cloudflare 版 functions/api/audio.js 仍在（pages.dev 用），此文件让
   vercel.app 走 Vercel 出口，绕开 CF 边缘限制，且随 Vercel 自动部署（无需 CF token）。

   两步：先 redirect:"manual" 读 302 的 Location（网易云锁曲会指向 /404），
   再升级 http→https 显式重取。 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CN_IP = "118.88.88.88";
const SPOOF = {
  "User-Agent": UA,
  Referer: "https://music.163.com",
  "X-Real-IP": CN_IP,
  "X-Forwarded-For": CN_IP,
};

export const config = { maxDuration: 20 };

// 带超时的 fetch：慢/不通的 CDN 节点快速中止，让前端立刻回退 iTunes，
// 而不是干等到平台超时（30s）。
async function fetchT(url, opts, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = String((req.query && req.query.id) || "");
  if (!id) return res.status(400).json({ error: "缺少 id" });

  const unavailable = () =>
    res
      .status(404)
      .json({ error: "无法获取完整音频（可能受版权保护或需要会员）。请换一首。" });

  try {
    const outer = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(
      id
    )}.mp3`;
    const r1 = await fetchT(outer, { headers: SPOOF, redirect: "manual" }, 6000);
    const loc = r1.headers.get("location") || "";
    // 会员/版权锁曲 → 302 指向 music.163.com/404
    if (!loc || /\/404(\b|$)/.test(loc)) return unavailable();

    const cdn = loc.replace(/^http:\/\//i, "https://");
    // 整段（含 5MB 下载）限时 12s：慢节点中止 → 前端回退 iTunes
    const r2 = await fetchT(cdn, { headers: SPOOF }, 12000);
    const ct = r2.headers.get("content-type") || "";
    const len = Number(r2.headers.get("content-length") || "0");
    if (!r2.ok || (!ct.includes("audio") && len < 100000)) return unavailable();

    const buf = Buffer.from(await r2.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buf);
  } catch (e) {
    // 超时/中止/回源失败一律当"取不到" → 前端走 iTunes 兜底
    return unavailable();
  }
}
