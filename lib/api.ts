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

/** Fetch the original audio via the CF proxy and base64-encode it in-browser. */
export async function fetchAudioB64(songId: number): Promise<string> {
  const res = await fetch(`/api/audio?id=${songId}`);
  if (!res.ok) {
    let msg = "无法获取音频";
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
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
  lyrics: string
): Promise<TabState> {
  const body = buildRoundBody(round, prev, hint, instrument, audioB64, lyrics);
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
