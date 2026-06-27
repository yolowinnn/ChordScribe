import { SongCandidate } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

// NetEase filters requests from non-CN / datacenter IPs (e.g. Vercel's US
// servers) and returns empty results. Spoofing a China-region client IP via
// X-Real-IP / X-Forwarded-For is the standard, widely-used workaround.
const CN_IP = process.env.NETEASE_REAL_IP || "118.88.88.88";

function neteaseHeaders(): Record<string, string> {
  return {
    "User-Agent": UA,
    Referer: "https://music.163.com",
    Cookie: "appver=8.0.0; os=pc",
    "X-Real-IP": CN_IP,
    "X-Forwarded-For": CN_IP,
  };
}

/**
 * Search NetEase Cloud Music for songs matching a free-text query
 * (e.g. "苏紫旭 18年后"). Returns ranked candidates.
 */
export async function searchSongs(query: string): Promise<SongCandidate[]> {
  const url = new URL("https://music.163.com/api/search/get/web");
  url.searchParams.set("s", query);
  url.searchParams.set("type", "1"); // 1 = single track
  url.searchParams.set("limit", "10");
  url.searchParams.set("offset", "0");

  const res = await fetch(url.toString(), {
    headers: neteaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NetEase search failed: ${res.status}`);
  const data = await res.json();
  const songs = data?.result?.songs ?? [];
  return songs.map(
    (s: any): SongCandidate => ({
      id: s.id,
      name: s.name,
      artists: (s.artists ?? []).map((a: any) => a.name).join(", "),
      album: s.album?.name ?? "",
      durationMs: s.duration ?? 0,
    })
  );
}

/**
 * Download the full audio for a NetEase song id via the public "outer url"
 * endpoint. Works for non-DRM tracks (most indie / freely-licensed songs).
 * Returns the raw mp3 bytes.
 */
export async function downloadAudio(songId: number): Promise<Buffer> {
  const url = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
  const res = await fetch(url, {
    headers: neteaseHeaders(),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Audio download failed: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  // NetEase returns a tiny html/text body when the track is unavailable.
  if (!ct.includes("audio") || buf.length < 100_000) {
    throw new Error(
      "无法获取该歌曲的完整音频（可能受版权保护或需要会员）。请换一首，或改用本地上传。"
    );
  }
  return buf;
}
