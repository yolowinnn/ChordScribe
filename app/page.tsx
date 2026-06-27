"use client";

import { useState } from "react";
import { SongCandidate, TabState } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLibrary, SavedTab } from "@/lib/library";
import TabView from "@/components/TabView";
import AuthModal from "@/components/AuthModal";

const MAX_ROUNDS = 5;
const EXAMPLES = ["苏紫旭 十八年后", "陈鸿宇 理想三旬", "赵雷 成都", "朴树 平凡之路"];

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
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SongCandidate[]>([]);
  const [selected, setSelected] = useState<SongCandidate | null>(null);
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [tab, setTab] = useState<TabState | null>(null);
  const [fromLibrary, setFromLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [menu, setMenu] = useState(false);

  function resetCreate() {
    setCandidates([]);
    setSelected(null);
    setTab(null);
    setLogs([]);
    setError(null);
    setFromLibrary(false);
  }

  async function search(q?: string) {
    const term = (q ?? query).trim();
    if (!term) return;
    setQuery(term);
    setView("create");
    resetCreate();
    setBusy(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
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

  async function pick(song: SongCandidate, forceRedo = false) {
    const existing = getTab(String(song.id));
    if (existing && !forceRedo) {
      // 已解析过 —— 秒开，不再重复解析
      setSelected(song);
      setCandidates([]);
      setTab(existing.state);
      setFromLibrary(true);
      setLogs([]);
      setError(null);
      return;
    }
    setSelected(song);
    setCandidates([]);
    setError(null);
    setTab(null);
    setFromLibrary(false);
    setBusy(true);
    let prev: TabState | null = null;
    let lastRound = 0;
    const hint = `${song.artists} - ${song.name}`;
    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        lastRound = round;
        setLogs((l) => [
          ...l.map((x) => ({ ...x, status: "done" as const })),
          { round, status: "active" },
        ]);
        const res = await fetch("/api/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: song.id, round, prevState: prev, hint }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `第 ${round} 轮转译失败`);
        const state: TabState = data.state;
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
      if (prev) saveTab(song, prev, lastRound); // 自动存进谱库
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openSaved(t: SavedTab) {
    setSelected(t.song);
    setTab(t.state);
    setFromLibrary(true);
    setLogs([]);
    setError(null);
    setView("detail");
  }

  const initial = (user?.email?.[0] || "?").toUpperCase();

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <div className="topbar">
        <div
          className="brand"
          onClick={() => {
            setView("create");
            resetCreate();
          }}
        >
          <div className="mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18V5l10-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="16" cy="16" r="3" />
            </svg>
          </div>
          <div>
            <div className="name">Chord<span>Scribe</span></div>
            <div className="tag">AI 吉他扒谱</div>
          </div>
        </div>

        <div className="topnav">
          <button
            className={`navlink ${view === "create" ? "active" : ""}`}
            onClick={() => setView("create")}
          >
            扒谱
          </button>
          <button
            className={`navlink ${view === "library" || view === "detail" ? "active" : ""}`}
            onClick={() => setView("library")}
          >
            我的谱库
            {tabs.length > 0 && <span className="badge">{tabs.length}</span>}
          </button>

          {ready && user ? (
            <div style={{ position: "relative" }}>
              <div className="user-chip" onClick={() => setMenu((m) => !m)}>
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={user.photoURL} alt="" />
                ) : (
                  <div className="avatar">{initial}</div>
                )}
                <span className="email">{user.email}</span>
              </div>
              {menu && (
                <div
                  className="modal"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 42,
                    width: 200,
                    padding: 10,
                    zIndex: 40,
                  }}
                  onMouseLeave={() => setMenu(false)}
                >
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%" }}
                    onClick={() => {
                      signOut();
                      setMenu(false);
                    }}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
              登录
            </button>
          )}
        </div>
      </div>

      {/* ---------- create / transcribe view ---------- */}
      {view === "create" && (
        <>
          {!selected && (
            <div className="hero">
              <div className="eyebrow">
                <span>🎸</span> Gemini 2.5 Pro 多模态 · 听音频扒谱
              </div>
              <h1>
                把任何歌，变成 <span className="grad">你能弹的吉他谱</span>
              </h1>
              <p>
                说出歌手和歌名，AI 自动找到原曲、聆听完整音频、循环多轮转译，
                扒出分段和弦、扫弦节奏与歌词对位 —— 解析一次，永久存进谱库。
              </p>
            </div>
          )}

          {!selected && (
            <>
              <div className="searchbar">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && search()}
                  placeholder="例如：苏紫旭 十八年后"
                  disabled={busy}
                />
                <button className="btn btn-primary" onClick={() => search()} disabled={busy || !query.trim()}>
                  {busy ? "搜索中…" : "扒谱"}
                </button>
              </div>
              <div className="chips">
                {EXAMPLES.map((ex) => (
                  <button key={ex} className="chip" onClick={() => search(ex)} disabled={busy}>
                    {ex}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div className="error">⚠️ {error}</div>}

          {candidates.length > 0 && (
            <>
              <div className="section-label">选择要扒谱的版本</div>
              <div className="candidates">
                {candidates.map((s) => {
                  const saved = !!getTab(String(s.id));
                  return (
                    <div className="song-row" key={s.id} onClick={() => pick(s)}>
                      <div className="left">
                        <div className="ic">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
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

          {selected && (
            <button className="backlink" onClick={() => { setSelected(null); setTab(null); setLogs([]); search(query); }}>
              ← 返回搜索结果
            </button>
          )}

          {logs.length > 0 && (
            <div className="progress-card">
              <div className="progress-head">
                {busy ? (
                  <div className="eq"><i /><i /><i /><i /><i /></div>
                ) : (
                  <div className="eq" style={{ opacity: 0.35 }}><i style={{ height: 14, animation: "none" }} /><i style={{ height: 20, animation: "none" }} /><i style={{ height: 10, animation: "none" }} /></div>
                )}
                <div>
                  <div className="t">
                    {busy ? `正在为《${selected?.name}》转译吉他谱` : `《${selected?.name}》转译完成`}
                  </div>
                  <div className="s">Gemini 2.5 Pro 逐轮聆听音频并修正和弦 · 最多 {MAX_ROUNDS} 轮</div>
                </div>
              </div>
              <div className="rounds">
                {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => {
                  const log = logs.find((l) => l.round === r);
                  const cls = !log ? "pending" : log.status === "active" ? "active" : "done";
                  return (
                    <div className={`round ${cls === "pending" ? "pendingrow" : ""}`} key={r}>
                      <div className="rail">
                        <div className={`dot ${cls}`}>
                          {cls === "active" ? <div className="mini-spinner" /> : cls === "done" ? "✓" : r}
                        </div>
                        <div className="line" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="rtitle">
                          {cls === "active" ? `正在进行第 ${r} 轮转译…` : `第 ${r} 轮`}
                        </div>
                        {log?.summary && <div className="rsum">{log.summary}</div>}
                        {log?.confidence != null && (
                          <div className="rconf">
                            <div className="confbar"><i style={{ width: `${Math.round(log.confidence * 100)}%` }} /></div>
                            置信度 {(log.confidence * 100).toFixed(0)}%
                          </div>
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
              <button className="btn btn-ghost" onClick={() => pick(selected, true)} disabled={busy}>
                重新解析
              </button>
            </div>
          )}

          {tab && <TabView state={tab} />}
        </>
      )}

      {/* ---------- library view ---------- */}
      {view === "library" && (
        <>
          <div className="hero" style={{ paddingBottom: 10 }}>
            <h1 style={{ fontSize: 34 }}>我的谱库</h1>
            <p>{user ? "已登录，跨设备云端同步。" : "未登录 —— 当前仅保存在此浏览器。登录后可云端同步、换设备直接看。"}</p>
          </div>
          {!user && (
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <button className="btn btn-primary" onClick={() => setShowAuth(true)}>登录以云端保存</button>
            </div>
          )}
          {tabs.length === 0 ? (
            <div className="empty">
              <div className="big">谱库还是空的</div>
              去「扒谱」搜一首歌，解析完会自动存到这里。
              <div style={{ marginTop: 18 }}>
                <button className="btn btn-primary" onClick={() => setView("create")}>去扒一首</button>
              </div>
            </div>
          ) : (
            <div className="lib-grid">
              {tabs.map((t) => (
                <div className="lib-card" key={t.id} onClick={() => openSaved(t)}>
                  <div className="glow" />
                  <button
                    className="ldel"
                    onClick={(e) => { e.stopPropagation(); if (confirm(`从谱库删除《${t.song.name}》？`)) removeTab(t.id); }}
                    title="删除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                  <div className="lname">{t.state.meta.title || t.song.name}</div>
                  <div className="lart">{t.song.artists}</div>
                  <div className="lmeta">
                    <span className="tagk">{t.state.meta.key}</span>
                    <span className="tagk">{t.state.meta.capo}</span>
                    <span className="tagk">{t.state.meta.bpm} BPM</span>
                  </div>
                  <div className="ldate">{fmtDate(t.updatedAt)} 解析 · {t.rounds} 轮</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- saved tab detail ---------- */}
      {view === "detail" && tab && selected && (
        <>
          <button className="backlink" onClick={() => setView("library")}>← 返回谱库</button>
          <div className="tab-top" style={{ marginTop: 4 }}>
            <span className="pill-saved" style={{ fontSize: 13 }}>📁 来自谱库 · 无需重新解析</span>
            <button className="btn btn-ghost" onClick={() => { setView("create"); pick(selected, true); }}>
              重新解析
            </button>
          </div>
          <TabView state={tab} />
        </>
      )}

      <div className="footer">
        ChordScribe · 网易云原曲音频 + Google Vertex AI Gemini 2.5 Pro<br />
        自动扒谱仅供学习与练习，版权归原作者所有。
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
