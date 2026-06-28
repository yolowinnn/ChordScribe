"use client";

import { useEffect, useRef, useState } from "react";

interface Str {
  label: string; // 弦名/音名
  note: string; // 音高名
  freq: number; // Hz
}
interface TunerInstrument {
  id: string;
  label: string;
  emoji: string;
  strings: Str[]; // 低 → 高
}

const TUNINGS: TunerInstrument[] = [
  {
    id: "guitar",
    label: "吉他",
    emoji: "🎸",
    strings: [
      { label: "6", note: "E2", freq: 82.41 },
      { label: "5", note: "A2", freq: 110.0 },
      { label: "4", note: "D3", freq: 146.83 },
      { label: "3", note: "G3", freq: 196.0 },
      { label: "2", note: "B3", freq: 246.94 },
      { label: "1", note: "E4", freq: 329.63 },
    ],
  },
  {
    id: "bass",
    label: "贝斯",
    emoji: "🎚️",
    strings: [
      { label: "4", note: "E1", freq: 41.2 },
      { label: "3", note: "A1", freq: 55.0 },
      { label: "2", note: "D2", freq: 73.42 },
      { label: "1", note: "G2", freq: 98.0 },
    ],
  },
  {
    id: "ukulele",
    label: "尤克里里",
    emoji: "🌺",
    strings: [
      { label: "4", note: "G4", freq: 392.0 },
      { label: "3", note: "C4", freq: 261.63 },
      { label: "2", note: "E4", freq: 329.63 },
      { label: "1", note: "A4", freq: 440.0 },
    ],
  },
  {
    id: "violin",
    label: "小提琴",
    emoji: "🎻",
    strings: [
      { label: "G", note: "G3", freq: 196.0 },
      { label: "D", note: "D4", freq: 293.66 },
      { label: "A", note: "A4", freq: 440.0 },
      { label: "E", note: "E5", freq: 659.25 },
    ],
  },
  {
    id: "cello",
    label: "大提琴",
    emoji: "🎻",
    strings: [
      { label: "C", note: "C2", freq: 65.41 },
      { label: "G", note: "G2", freq: 98.0 },
      { label: "D", note: "D3", freq: 146.83 },
      { label: "A", note: "A3", freq: 220.0 },
    ],
  },
];

export default function Tuner({ onClose }: { onClose: () => void }) {
  const [inst, setInst] = useState<TunerInstrument>(TUNINGS[0]);
  const [playing, setPlaying] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  function stop() {
    if (oscRef.current && ctxRef.current) {
      const { osc, gain } = oscRef.current;
      const t = ctxRef.current.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.03);
      osc.stop(t + 0.2);
      oscRef.current = null;
    }
    setPlaying(null);
  }

  function play(s: Str) {
    const key = inst.id + s.note;
    if (playing === key) {
      stop();
      return;
    }
    stop();
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = s.freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    oscRef.current = { osc, gain };
    setPlaying(key);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchInst(t: TunerInstrument) {
    stop();
    setInst(t);
  }

  return (
    <div className="modal-bg" onClick={() => { stop(); onClose(); }}>
      <div className="modal tuner" onClick={(e) => e.stopPropagation()}>
        <h2>🎵 调音器</h2>
        <div className="sub">点弦发出标准音，照着把每根弦调到同一个音高。建议在安静环境、外接音箱效果更好。</div>

        <div className="tuner-tabs">
          {TUNINGS.map((t) => (
            <button key={t.id} className={`tuner-tab ${inst.id === t.id ? "active" : ""}`} onClick={() => switchInst(t)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="tuner-strings">
          {inst.strings.map((s) => {
            const key = inst.id + s.note;
            const on = playing === key;
            return (
              <button key={key} className={`tuner-string ${on ? "ringing" : ""}`} onClick={() => play(s)}>
                <span className="ts-note">{s.note}</span>
                <span className="ts-label">{s.label} 弦</span>
                {on && <span className="ts-wave" />}
              </button>
            );
          })}
        </div>

        <div className="tuner-tuning">标准调弦：{inst.strings.map((s) => s.note.replace(/\d/, "")).join(" · ")}</div>
        <div className="modal-foot">提示：发声后拨动对应琴弦，听到的音比标准音低就拧紧、高就放松。</div>
      </div>
    </div>
  );
}
