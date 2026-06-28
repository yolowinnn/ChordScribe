/* Cloudflare Pages Function: GET /api/lyrics?id=<songId>
   拉取网易云【官方歌词】（比 Gemini 听写准）。去掉时间轴，返回纯歌词文本，
   供前端喂给 Gemini 做和弦对位（不再让模型自己听写歌词）。 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CN_IP = "118.88.88.88";
const CORS = { "Access-Control-Allow-Origin": "*" };
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "Content-Type": "application/json", ...CORS } });

function stripLrc(lrc) {
  if (!lrc) return "";
  return lrc
    .split("\n")
    .map((l) => l.replace(/\[\d{1,2}:\d{1,2}(\.\d{1,3})?\]/g, "").trim()) // 去时间轴
    .filter(Boolean)
    .join("\n");
}

export async function onRequestGet(context) {
  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) return json({ error: "缺少 id" }, 400);
  const url = `https://music.163.com/api/song/lyric?os=pc&id=${encodeURIComponent(id)}&lv=-1&kv=-1&tv=-1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://music.163.com", Cookie: "appver=8.0.0; os=pc", "X-Real-IP": CN_IP, "X-Forwarded-For": CN_IP },
    });
    const data = await res.json();
    const lyric = stripLrc((data && data.lrc && data.lrc.lyric) || "");
    const trans = stripLrc((data && data.tlyric && data.tlyric.lyric) || "");
    return json({ lyric, trans, hasLyric: !!lyric });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 502);
  }
}
