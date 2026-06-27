"use client";

import { useState } from "react";
import { SongCandidate, TabState } from "@/lib/types";
import { INSTRUMENTS, InstrumentId, getInstrument } from "@/lib/instruments";
import { useAuth } from "@/lib/auth";
import { useLibrary, SavedTab, tabId } from "@/lib/library";
import { searchSongs, fetchAudioB64, runRound } from "@/lib/api";
import TabView from "@/components/TabView";
import AuthModal from "@/components/AuthModal";

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
function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Home() {
  const { user, ready, signOut } = useAuth();
  const { tabs, getTab, saveTab, removeTab } = useLibrary(user);

  const [view, setView] = useState<"create" | "library" | "detail">("create");
  const [instrument, setInstrument] = useState<InstrumentId>("guitar");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SongCandidate[]>([]);
  const [selected, setSelected] = useState<SongCandidate | null>(null);
  const [phase, setPhase] = useState<"idle" | "audio" | "rounds">("idle");
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [tab, setTab] = useState<TabState | null>(null);
  const [fromLibrary, setFromLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [menu, setMenu] = useState(false);
  const [libFilter, setLibFilter] = useState<InstrumentId | "all">("all");

  const ins = getInstrument(instrument);

  function resetCreate() {
    setCandidates([]);
    setSelected(null);
    setTab(null);
    setLogs([]);
    setError(null);
    setFromLibrary(false);
    setPhase("idle");
  }

  async function search(q?: string) {
    const term = (q ?? query).trim();
    if (!term) return;
    setQuery(term);
    setView("create");
    resetCreate();
    setBusy(true);
    try {
      const songs = await searchSongs(term);
      if (!songs.length) throw new Error("没有找到匹配的歌曲，换个关键词试试");
      setCandidates(songs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function pick(song: SongCandidate, forceRedo = false) {
    const existing = getTab(tabId(instrument, song.id));
    if (existing && !forceRedo) {
      setSelected(song);
      setCandidates([]);
      setTab(existing.state);
      setFromLibrary(true);
      setLogs([]);
      setError(null);
      setPhase("idle");
      return;
    }
    setSelected(song);
    setCandidates([]);
    setError(null);
    setTab(null);
    setFromLibrary(false);
    setBusy(true);
    setLogs([]);
    const hint = `${song.artists} - ${song.name}`;
    try {
      setPhase("audio");
      const audioB64 = await fetchAudioB64(song.id);
      setPhase("rounds");

      let prev: TabState | null = null;
      let lastRound = 0;
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        lastRound = round;
        setLogs((l) => [
          ...l.map((x) => ({ ...x, status: "done" as const })),
          { round, status: "active" },
        ]);
        const state = await runRound(round, prev, hint, instrument, audioB64);
        prev = state;
        setTab(state);
        setLogs((l) =>
          l.map((x) =>
            x.round === round
              ? { ...x, status: "done", summary: state.roundSummary, confidence: state.confidence }
              : x
          )
        );
        if (state.done) break;
      }
      if (prev) saveTab(song, prev, lastRound, instrument);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openSaved(t: SavedTab) {
    setInstrument(t.instrument);
    setSelected(t.song);
    setTab(t.state);
    setFromLibrary(true);
    setLogs([]);
    setError(null);
    setView("detail");
  }

  const initial = (user?.email?.[0] || "?").toUpperCase();
  const filteredTabs =
    libFilter === "all" ? tabs : tabs.filter((t) => t.instrument === libFilter);
  const usedInstruments = Array.from(new Set(tabs.map((t) => t.instrument)));

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <div className="topbar">
        <div className="brand" onClick={() => { setView("create"); resetCreate(); }}>
          <div className="mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18V5l10-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="16" cy="16" r="3" />
            </svg>
          </div>
          <div>
            <div className="name">Chord<span>Scribe</span></div>
            <div className="tag">AI 多乐器扒谱</div>
          </div>
        </div>

        <div className="topnav">
          <button className={`navlink ${view === "create" ? "active" : ""}`} onClick={() => setView("create")}>扒谱</button>
          <button className={`navlink ${view === "library" || view === "detail" ? "active" : ""}`} onClick={() => setView("library")}>
            我的谱库{tabs.length > 0 && <span className="badge">{tabs.length}</span>}
          </button>
          {ready && user ? (
            <div style={{ position: "relative" }}>
              <div className="user-chip" onClick={() => setMenu((m) => !m)}>
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={user.photoURL} alt="" />
                ) : (<div className="avatar">{initial}</div>)}
                <span className="email">{user.email}</span>
              </div>
              {menu && (
                <div className="modal" style={{ position: "absolute", right: 0, top: 42, width: 200, padding: 10, zIndex: 40 }} onMouseLeave={() => setMenu(false)}>
                  <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => { signOut(); setMenu(false); }}>退出登录</button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>登录</button>
          )}
        </div>
      </div>

      {/* ---------- create view ---------- */}
      {view === "create" && (
        <>
          {!selected && (
            <>
              <div className="hero">
                <div className="eyebrow"><span>{ins.emoji}</span> Gemini 2.5 Pro 多模态 · 听音频扒谱</div>
                <h1>把任何歌，变成 <span className="grad">你能弹的谱子</span></h1>
                <p>选乐器 → 说出歌手歌名，AI 自动找原曲、聆听完整音频、循环多轮转译，扒出{ins.tagline} —— 解析一次，永久存进谱库。</p>
              </div>

              <div className="section-label">① 选择乐器</div>
              <div className="inst-grid">
                {INSTRUMENTS.filter((i) => i.primary).map((i) => (
                  <div key={i.id} className={`inst-card ${instrument === i.id ? "active" : ""}`} style={{ ["--ic" as any]: i.accent }} onClick={() => setInstrument(i.id)}>
                    <div className="iglow" />
                    <div className="icheck">✓</div>
                    <div className="iemoji">{i.emoji}</div>
                    <div className="ilabel">{i.label}</div>
                    <div className="iname">{i.en}</div>
                    <div className="itag">{i.tagline}</div>
                  </div>
                ))}
              </div>
              <div className="inst-sub">弦乐（试验）</div>
              <div className="inst-grid">
                {INSTRUMENTS.filter((i) => !i.primary).map((i) => (
                  <div key={i.id} className={`inst-card ${instrument === i.id ? "active" : ""}`} style={{ ["--ic" as any]: i.accent }} onClick={() => setInstrument(i.id)}>
                    <div className="iglow" />
                    <div className="icheck">✓</div>
                    <div className="iemoji">{i.emoji}</div>
                    <div className="ilabel">{i.label}</div>
                    <div className="iname">{i.en}</div>
                    <div className="itag">{i.tagline}</div>
                  </div>
                ))}
              </div>

              <div className="section-label" style={{ marginTop: 28 }}>② 搜索歌曲</div>
              <div className="searchbar">
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && search()} placeholder="例如：苏紫旭 十八年后" disabled={busy} />
                <button className="btn btn-primary" onClick={() => search()} disabled={busy || !query.trim()}>{busy ? "搜索中…" : `扒 ${ins.label}谱`}</button>
              </div>
            </>
          )}

          {error && <div className="error">⚠️ {error}</div>}

          {candidates.length > 0 && (
            <>
              <div className="section-label">③ 选择版本（{ins.emoji} {ins.label}谱）</div>
              <div className="candidates">
                {candidates.map((s) => {
                  const saved = !!getTab(tabId(instrument, s.id));
                  return (
                    <div className="song-row" key={s.id} onClick={() => pick(s)}>
                      <div className="left">
                        <div className="ic">{ins.emoji}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="name">{s.name}</div>
                          <div className="meta">{s.artists}{s.album ? ` · ${s.album}` : ""}</div>
                        </div>
                      </div>
                      <div className="right">
                        {saved && <span className="pill-saved">谱库已有</span>}
                        <span className="dur">{fmtDur(s.durationMs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {selected && !fromLibrary && (
            <button className="backlink" onClick={() => { resetCreate(); search(query); }}>← 返回搜索结果</button>
          )}

          {selected && (phase !== "idle" || logs.length > 0) && (
            <div className="progress-card">
              <div className="progress-head">
                {busy ? <div className="eq"><i /><i /><i /><i /><i /></div> : <div className="eq" style={{ opacity: .35 }}><i style={{ height: 14, animation: "none" }} /><i style={{ height: 20, animation: "none" }} /><i style={{ height: 10, animation: "none" }} /></div>}
                <div>
                  <div className="t">{busy ? `正在为《${selected.name}》扒 ${ins.label}谱` : `《${selected.name}》${ins.label}谱完成`}</div>
                  <div className="s">{ins.emoji} {ins.label} · Gemini 2.5 Pro 逐轮聆听并精修 · 最多 {MAX_ROUNDS} 轮</div>
                </div>
              </div>
              <div className="rounds">
                <div className="round">
                  <div className="rail"><div className={`dot ${phase === "audio" ? "active" : "done"}`}>{phase === "audio" ? <div className="mini-spinner" /> : "✓"}</div><div className="line" /></div>
                  <div style={{ flex: 1 }}><div className="rtitle">{phase === "audio" ? "正在获取原曲完整音频…" : "已获取原曲音频"}</div></div>
                </div>
                {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => {
                  const log = logs.find((l) => l.round === r);
                  const cls = !log ? "pending" : log.status === "active" ? "active" : "done";
                  return (
                    <div className={`round ${cls === "pending" ? "pendingrow" : ""}`} key={r}>
                      <div className="rail"><div className={`dot ${cls}`}>{cls === "active" ? <div className="mini-spinner" /> : cls === "done" ? "✓" : r}</div><div className="line" /></div>
                      <div style={{ flex: 1 }}>
                        <div className="rtitle">{cls === "active" ? `正在进行第 ${r} 轮转译…` : `第 ${r} 轮`}</div>
                        {log?.summary && <div className="rsum">{log.summary}</div>}
                        {log?.confidence != null && (
                          <div className="rconf"><div className="confbar"><i style={{ width: `${Math.round(log.confidence * 100)}%` }} /></div>置信度 {(log.confidence * 100).toFixed(0)}%</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab && fromLibrary && selected && (
            <div className="tab-top" style={{ marginTop: 4 }}>
              <span className="pill-saved" style={{ fontSize: 13 }}>📁 来自谱库 · 无需重新解析</span>
              <button className="btn btn-ghost" onClick={() => pick(selected, true)} disabled={busy}>重新解析</button>
            </div>
          )}

          {tab && <TabView state={tab} />}
        </>
      )}

      {/* ---------- library ---------- */}
      {view === "library" && (
        <>
          <div className="hero" style={{ paddingBottom: 10 }}>
            <h1 style={{ fontSize: 34 }}>我的谱库</h1>
            <p>{user ? "已登录，跨设备云端同步。" : "未登录 —— 当前仅保存在此浏览器。登录后云端同步、换设备直接看。"}</p>
          </div>
          {!user && <div style={{ textAlign: "center", marginBottom: 18 }}><button className="btn btn-primary" onClick={() => setShowAuth(true)}>登录以云端保存</button></div>}
          {tabs.length > 0 && (
            <div className="inst-filter">
              <button className={`fchip ${libFilter === "all" ? "active" : ""}`} onClick={() => setLibFilter("all")}>全部 {tabs.length}</button>
              {usedInstruments.map((id) => {
                const it = getInstrument(id);
                return <button key={id} className={`fchip ${libFilter === id ? "active" : ""}`} onClick={() => setLibFilter(id)}>{it.emoji} {it.label} {tabs.filter((t) => t.instrument === id).length}</button>;
              })}
            </div>
          )}
          {filteredTabs.length === 0 ? (
            <div className="empty">
              <div className="big">{tabs.length === 0 ? "谱库还是空的" : "该乐器下还没有谱"}</div>
              去「扒谱」选个乐器搜一首歌，解析完会自动存到这里。
              <div style={{ marginTop: 18 }}><button className="btn btn-primary" onClick={() => setView("create")}>去扒一首</button></div>
            </div>
          ) : (
            <div className="lib-grid">
              {filteredTabs.map((t) => {
                const it = getInstrument(t.instrument);
                return (
                  <div className="lib-card" key={t.id} onClick={() => openSaved(t)}>
                    <div className="glow" />
                    <div className="ibadge" title={it.label}>{it.emoji}</div>
                    <button className="ldel" onClick={(e) => { e.stopPropagation(); if (confirm(`从谱库删除《${t.song.name}》的${it.label}谱？`)) removeTab(t.id); }} title="删除">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                    <div className="lname">{t.state.meta.title || t.song.name}</div>
                    <div className="lart">{t.song.artists}</div>
                    <div className="lmeta">
                      <span className="tagk">{it.label}</span>
                      <span className="tagk">{t.state.meta.key}</span>
                      <span className="tagk">{t.state.meta.bpm} BPM</span>
                    </div>
                    <div className="ldate">{fmtDate(t.updatedAt)} 解析 · {t.rounds} 轮</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------- detail ---------- */}
      {view === "detail" && tab && selected && (
        <>
          <button className="backlink" onClick={() => setView("library")}>← 返回谱库</button>
          <div className="tab-top" style={{ marginTop: 4 }}>
            <span className="pill-saved" style={{ fontSize: 13 }}>📁 来自谱库 · 无需重新解析</span>
            <button className="btn btn-ghost" onClick={() => { setView("create"); pick(selected, true); }}>重新解析</button>
          </div>
          <TabView state={tab} />
        </>
      )}

      <div className="footer">
        ChordScribe · 网易云原曲音频 + Google Vertex AI Gemini 2.5 Pro · 部署于 Cloudflare<br />
        自动扒谱仅供学习与练习，版权归原作者所有。
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
