"use client";

import { useState } from "react";
import { SongCandidate, TabState } from "@/lib/types";
import TabView from "@/components/TabView";

const MAX_ROUNDS = 5;

interface RoundLog {
  round: number;
  status: "active" | "done";
  summary?: string;
  confidence?: number;
}

function fmtDur(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [query, setQuery] = useState("苏紫旭 十八年后");
  const [candidates, setCandidates] = useState<SongCandidate[]>([]);
  const [selected, setSelected] = useState<SongCandidate | null>(null);
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [tab, setTab] = useState<TabState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    setCandidates([]);
    setSelected(null);
    setTab(null);
    setLogs([]);
    setBusy(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "搜索失败");
      if (!data.songs?.length) throw new Error("没有找到匹配的歌曲，换个关键词试试");
      setCandidates(data.songs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function transcribe(song: SongCandidate) {
    setSelected(song);
    setCandidates([]);
    setError(null);
    setTab(null);
    setBusy(true);
    let prev: TabState | null = null;
    const hint = `${song.artists} - ${song.name}`;

    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        setLogs((l) => [
          ...l.map((x) => ({ ...x, status: "done" as const })),
          { round, status: "active" },
        ]);

        const res = await fetch("/api/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: song.id,
            round,
            prevState: prev,
            hint,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `第 ${round} 轮转译失败`);

        const state: TabState = data.state;
        prev = state;
        setTab(state);
        setLogs((l) =>
          l.map((x) =>
            x.round === round
              ? {
                  ...x,
                  status: "done",
                  summary: state.roundSummary,
                  confidence: state.confidence,
                }
              : x
          )
        );

        if (state.done) break;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="header">
        <h1>
          Chord<span className="accent">Scribe</span> · AI 吉他扒谱
        </h1>
        <p>
          说出歌手 + 歌名，AI 自动找到原曲、聆听完整音频、循环多轮转译，扒出分段和弦吉他谱。
        </p>
      </div>

      <div className="searchbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && search()}
          placeholder="例如：苏紫旭 十八年后"
          disabled={busy}
        />
        <button className="btn" onClick={search} disabled={busy || !query.trim()}>
          {busy && !selected ? "搜索中…" : "搜索"}
        </button>
      </div>
      <div className="hint">
        引擎：网易云原曲音频 + Google Vertex AI · Gemini 2.5 Pro 多模态聆听。
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {candidates.length > 0 && (
        <div className="candidates">
          {candidates.map((s) => (
            <div className="song" key={s.id} onClick={() => transcribe(s)}>
              <div>
                <div className="name">{s.name}</div>
                <div className="meta">
                  {s.artists}
                  {s.album ? ` · ${s.album}` : ""}
                </div>
              </div>
              <div className="dur">{fmtDur(s.durationMs)}</div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="progress">
          <h3>
            {selected ? `正在为《${selected.name}》转译吉他谱` : "转译进度"}
          </h3>
          {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => {
            const log = logs.find((l) => l.round === r);
            const cls = !log
              ? "pending"
              : log.status === "active"
              ? "active"
              : "done";
            return (
              <div className="round" key={r}>
                <div className={`dot ${cls}`}>
                  {cls === "active" ? (
                    <div className="spinner" />
                  ) : cls === "done" ? (
                    "✓"
                  ) : (
                    r
                  )}
                </div>
                <div className="body">
                  <div className="title">
                    {cls === "active"
                      ? `正在进行第 ${r} 轮转译…`
                      : `第 ${r} 轮`}
                  </div>
                  {log?.summary && <div className="sum">{log.summary}</div>}
                  {log?.confidence != null && (
                    <div className="conf">
                      置信度 {(log.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab && <TabView state={tab} />}

      <div className="footer">
        ChordScribe — 自动扒谱仅供学习与练习，版权归原作者所有。
      </div>
    </div>
  );
}
