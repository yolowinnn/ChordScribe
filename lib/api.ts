"use client";

import { SongCandidate, TabState } from "./types";
import { InstrumentId } from "./instruments";
import { buildRoundBody } from "./prompts";

export async function searchSongs(query: string): Promise<SongCandidate[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "搜索失败");
  return data.songs || [];
}

/** Fetch official lyrics (NetEase) — more accurate than Gemini transcription. */
export async function fetchLyrics(songId: number): Promise<string> {
  try {
    const res = await fetch(`/api/lyrics?id=${songId}`);
    if (!res.ok) return "";
    const data = await res.json();
    return data.lyric || "";
  } catch {
    return "";
  }
}

export interface AudioResult {
  b64: string;
  mime: string; // Gemini inlineData mimeType
  source: "netease" | "itunes";
  seconds?: number; // 片段时长（iTunes 试听约 30s）
}

/** iTunes Search API 走 JSONP（该接口不带 CORS 头，但支持 &callback=）。 */
function itunesSearch(term: string): Promise<any[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve([]);
    const cb = `__itunes_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement("script");
    const done = (results: any[]) => {
      clearTimeout(timer);
      try {
        delete (window as any)[cb];
      } catch {}
      script.remove();
      resolve(results);
    };
    const timer = setTimeout(() => done([]), 8000);
    (window as any)[cb] = (data: any) => done(data?.results || []);
    script.onerror = () => done([]);
    script.src =
      `https://itunes.apple.com/search?media=music&limit=5&country=CN` +
      `&term=${encodeURIComponent(term)}&callback=${cb}`;
    document.body.appendChild(script);
  });
}

/** 取 iTunes 试听可直接播放的 URL（供播放器用；试听音频带 CORS *，<audio> 可直接放）。 */
export async function itunesPreviewUrl(
  name: string,
  artist: string
): Promise<string | null> {
  const results = await itunesSearch(`${name} ${artist}`.trim());
  const hit = results.find((r) => r?.previewUrl) || null;
  return hit?.previewUrl || null;
}

/** iTunes 免费试听兜底：网易云会员锁的歌，用 Apple 30s 试听片段扒谱。 */
async function fetchItunesPreview(
  name: string,
  artist: string
): Promise<AudioResult | null> {
  const results = await itunesSearch(`${name} ${artist}`.trim());
  const hit = results.find((r) => r?.previewUrl) || null;
  if (!hit?.previewUrl) return null;
  const a = await fetch(hit.previewUrl); // 试听音频带 access-control-allow-origin: *
  if (!a.ok) return null;
  const buf = await a.arrayBuffer();
  return {
    b64: arrayBufferToBase64(buf),
    mime: "audio/mp4", // Apple 试听是 m4a(AAC)，Gemini 用 audio/mp4 可读
    source: "itunes",
    seconds: Math.round((hit.trackTimeMillis ? 30000 : 30000) / 1000),
  };
}

/**
 * 取原曲音频并 base64。优先网易云完整音源；若被会员/版权限制取不到，
 * 自动回退到 iTunes 免费试听片段（约 30s，免费、无会员墙）。
 */
export async function fetchAudioB64(
  songId: number,
  name?: string,
  artist?: string
): Promise<AudioResult> {
  const res = await fetch(`/api/audio?id=${songId}`);
  if (res.ok) {
    const buf = await res.arrayBuffer();
    return { b64: arrayBufferToBase64(buf), mime: "audio/mpeg", source: "netease" };
  }
  // 网易云取不到（多为 fee=1 会员歌）→ iTunes 免费试听兜底
  if (name) {
    try {
      const it = await fetchItunesPreview(name, artist || "");
      if (it) return it;
    } catch {}
  }
  let msg = "无法获取音频（网易云受限，且未找到 iTunes 免费试听）";
  try {
    msg = (await res.json()).error || msg;
  } catch {}
  throw new Error(msg);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    );
  }
  return btoa(binary);
}

/** Run one transcription round through the CF proxy → Vertex Gemini. */
export async function runRound(
  round: number,
  prev: TabState | null,
  hint: string,
  instrument: InstrumentId,
  audioB64: string,
  lyrics: string,
  mime: string = "audio/mpeg"
): Promise<TabState> {
  const body = buildRoundBody(round, prev, hint, instrument, audioB64, lyrics, mime);
  const res = await fetch("/api/round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data?.detail || `第 ${round} 轮转译失败`);
  }
  const cand = data?.candidates?.[0];
  const reason = cand?.finishReason;
  const text: string = (cand?.content?.parts || [])
    .map((p: any) => p.text || "")
    .join("");
  if (!text) throw new Error(`Gemini 未返回内容 (finishReason=${reason || "?"})`);
  if (reason === "MAX_TOKENS")
    throw new Error("本轮输出过长被截断，请稍后重试。");
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  }
}
