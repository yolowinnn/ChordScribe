"use client";

import { useEffect, useRef, useState } from "react";
import { autoCorrelate, freqToNote, nearestTarget } from "@/lib/pitch";

interface Str { label: string; note: string; freq: number; }
interface TunerInstrument { id: string; label: string; emoji: string; strings: Str[]; }

const TUNINGS: TunerInstrument[] = [
  { id: "guitar", label: "吉他", emoji: "🎸", strings: [
    { label: "6", note: "E2", freq: 82.41 }, { label: "5", note: "A2", freq: 110.0 },
    { label: "4", note: "D3", freq: 146.83 }, { label: "3", note: "G3", freq: 196.0 },
    { label: "2", note: "B3", freq: 246.94 }, { label: "1", note: "E4", freq: 329.63 } ] },
  { id: "bass", label: "贝斯", emoji: "🎚️", strings: [
    { label: "4", note: "E1", freq: 41.2 }, { label: "3", note: "A1", freq: 55.0 },
    { label: "2", note: "D2", freq: 73.42 }, { label: "1", note: "G2", freq: 98.0 } ] },
  { id: "ukulele", label: "尤克里里", emoji: "🌺", strings: [
    { label: "4", note: "G4", freq: 392.0 }, { label: "3", note: "C4", freq: 261.63 },
    { label: "2", note: "E4", freq: 329.63 }, { label: "1", note: "A4", freq: 440.0 } ] },
  { id: "violin", label: "小提琴", emoji: "🎻", strings: [
    { label: "G", note: "G3", freq: 196.0 }, { label: "D", note: "D4", freq: 293.66 },
    { label: "A", note: "A4", freq: 440.0 }, { label: "E", note: "E5", freq: 659.25 } ] },
  { id: "cello", label: "大提琴", emoji: "🎻", strings: [
    { label: "C", note: "C2", freq: 65.41 }, { label: "G", note: "G2", freq: 98.0 },
    { label: "D", note: "D3", freq: 146.83 }, { label: "A", note: "A3", freq: 220.0 } ] },
];

interface Reading { fullName: string; cents: number; targetIdx: number; targetCents: number; freq: number; }

export default function Tuner({ onClose }: { onClose: () => void }) {
  const [inst, setInst] = useState<TunerInstrument>(TUNINGS[0]);
  const [mode, setMode] = useState<"tone" | "mic">("tone");
  const [playing, setPlaying] = useState<string | null>(null);
  const [micErr, setMicErr] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  // mic
  const streamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const instRef = useRef(inst);
  useEffect(() => { instRef.current = inst; }, [inst]);

  // ---- 标准音 ----
  function stopTone() {
    if (oscRef.current && ctxRef.current) {
      const { osc, gain } = oscRef.current;
      const t = ctxRef.current.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0, t, 0.03);
      osc.stop(t + 0.2); oscRef.current = null;
    }
    setPlaying(null);
  }
  function playTone(s: Str) {
    const key = inst.id + s.note;
    if (playing === key) { stopTone(); return; }
    stopTone();
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = "triangle"; osc.frequency.value = s.freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.04);
    osc.connect(gain).connect(ctx.destination); osc.start();
    oscRef.current = { osc, gain }; setPlaying(key);
  }

  // ---- 麦克风 ----
  async function startMic() {
    setMicErr(null);
    stopTone();
    try {
      // 先在用户手势内创建并 resume AudioContext —— 否则 await 之后再建会处于 suspended，
      // 分析器读到的全是静音，导致永远检测不到。
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      micCtxRef.current = ctx;
      ctx.resume().catch(() => {}); // 不 await，避免无手势时挂起阻塞后续流程

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      streamRef.current = stream;
      ctx.resume().catch(() => {});

      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      src.connect(an);
      // 接一条零增益到 destination，确保音频图被驱动（部分浏览器不连到输出就不处理）
      const sink = ctx.createGain();
      sink.gain.value = 0;
      an.connect(sink).connect(ctx.destination);
      analyserRef.current = an;
      bufRef.current = new Float32Array(an.fftSize);

      // 用 setInterval 而非 rAF：后台/失焦标签页 rAF 会被暂停，setInterval 仍稳定触发
      const tick = () => {
        const an2 = analyserRef.current, buf = bufRef.current, c = micCtxRef.current;
        if (!an2 || !buf || !c) return;
        if (c.state === "suspended") c.resume().catch(() => {});
        an2.getFloatTimeDomainData(buf);
        const f = autoCorrelate(buf, c.sampleRate);
        if (f > 0) {
          const n = freqToNote(f);
          const t = nearestTarget(f, instRef.current.strings.map((s) => s.freq));
          setReading({ fullName: n.fullName, cents: n.cents, targetIdx: t.idx, targetCents: t.cents, freq: f });
        } else {
          setReading(null);
        }
      };
      rafRef.current = window.setInterval(tick, 70); // ~14fps，足够调音且省 CPU
    } catch (e: any) {
      setMicErr(e?.name === "NotAllowedError" ? "麦克风权限被拒绝，请在浏览器允许后重试" : "无法访问麦克风：" + (e?.message || e));
      setMode("tone");
    }
  }
  function stopMic() {
    if (rafRef.current) clearInterval(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (micCtxRef.current) { micCtxRef.current.close().catch(() => {}); micCtxRef.current = null; }
    analyserRef.current = null; bufRef.current = null; setReading(null);
  }

  function switchMode(m: "tone" | "mic") {
    if (m === mode) return;
    if (m === "mic") { setMode("mic"); startMic(); }
    else { stopMic(); setMode("tone"); }
  }
  function switchInst(t: TunerInstrument) {
    stopTone(); setInst(t); setReading(null);
  }

  useEffect(() => () => { stopTone(); stopMic(); }, []); // 卸载时释放

  // ---- 麦克风读数 UI ----
  const target = reading ? inst.strings[reading.targetIdx] : null;
  const cents = reading ? reading.targetCents : 0;
  const inTune = reading != null && Math.abs(cents) <= 5;
  const needlePct = Math.max(-50, Math.min(50, cents)) / 50 * 50; // -50%..50%
  const statusText = !reading
    ? "拨一下琴弦…"
    : inTune ? "✓ 准了" : cents < 0 ? `偏低 ${Math.abs(cents)}¢ · 拧紧` : `偏高 ${cents}¢ · 放松`;

  return (
    <div className="modal-bg" onClick={() => { stopTone(); stopMic(); onClose(); }}>
      <div className="modal tuner" onClick={(e) => e.stopPropagation()}>
        <h2>🎵 调音器</h2>
        <div className="sub">「标准音」点弦发声按耳朵调；「麦克风」拨弦实时检测音准，照着指示拧紧/放松。</div>

        <div className="tuner-mode">
          <button className={`tm-btn ${mode === "tone" ? "active" : ""}`} onClick={() => switchMode("tone")}>🔊 标准音</button>
          <button className={`tm-btn ${mode === "mic" ? "active" : ""}`} onClick={() => switchMode("mic")}>🎤 麦克风校音</button>
        </div>

        <div className="tuner-tabs">
          {TUNINGS.map((t) => (
            <button key={t.id} className={`tuner-tab ${inst.id === t.id ? "active" : ""}`} onClick={() => switchInst(t)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {mode === "mic" && (
          <div className="meter">
            {micErr && <div className="meter-err">⚠️ {micErr}</div>}
            <div className={`meter-note ${inTune ? "ok" : ""}`}>{reading ? reading.fullName : "—"}</div>
            <div className="meter-target">{target ? `正在调：${target.note}（${target.label} 弦）` : "对准任意一根弦"}</div>
            <div className="meter-bar">
              <span className="mb-tick mb-l">♭ 低</span>
              <div className="mb-track">
                <div className="mb-center" />
                {reading && <div className={`mb-needle ${inTune ? "ok" : ""}`} style={{ left: `calc(50% + ${needlePct}%)` }} />}
              </div>
              <span className="mb-tick mb-r">高 ♯</span>
            </div>
            <div className={`meter-status ${inTune ? "ok" : ""}`}>{statusText}</div>
          </div>
        )}

        <div className="tuner-strings">
          {inst.strings.map((s, i) => {
            const key = inst.id + s.note;
            const on = mode === "tone" ? playing === key : reading?.targetIdx === i;
            return (
              <button key={key} className={`tuner-string ${on ? "ringing" : ""}`} onClick={() => mode === "tone" && playTone(s)}>
                <span className="ts-note">{s.note}</span>
                <span className="ts-label">{s.label} 弦</span>
                {on && <span className="ts-wave" />}
              </button>
            );
          })}
        </div>

        <div className="tuner-tuning">标准调弦：{inst.strings.map((s) => s.note.replace(/\d/, "")).join(" · ")}</div>
        <div className="modal-foot">{mode === "mic" ? "对着麦克风拨弦，针在中间且变绿即调准。安静环境更准。" : "发声后拨动对应琴弦，听到的音比标准音低就拧紧、高就放松。"}</div>
      </div>
    </div>
  );
}
