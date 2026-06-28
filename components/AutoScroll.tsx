"use client";

import { useEffect, useRef, useState } from "react";

const SPEEDS = [18, 30, 45, 65, 90]; // px/s 档位
const LABELS = ["0.5×", "1×", "1.5×", "2×", "3×"];

export default function AutoScroll() {
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  const acc = useRef<number>(0);
  const speedRef = useRef(SPEEDS[1]);

  useEffect(() => {
    speedRef.current = SPEEDS[speedIdx];
  }, [speedIdx]);

  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    last.current = 0;
    acc.current = 0;
    const step = (ts: number) => {
      if (!last.current) last.current = ts;
      const dt = (ts - last.current) / 1000;
      last.current = ts;
      acc.current += speedRef.current * dt;
      const px = Math.floor(acc.current);
      if (px >= 1) {
        window.scrollBy(0, px);
        acc.current -= px;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  // 用户手动滚动时不打断（保持简单）；离开页面停止
  useEffect(() => {
    return () => setPlaying(false);
  }, []);

  return (
    <div className="autoscroll">
      <button
        className="as-play"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "暂停" : "自动滚动"}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
        <span>{playing ? "暂停" : "自动滚动"}</span>
      </button>
      <div className="as-speed">
        <button onClick={() => setSpeedIdx((i) => Math.max(0, i - 1))} disabled={speedIdx === 0}>−</button>
        <span className="as-label">{LABELS[speedIdx]}</span>
        <button onClick={() => setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))} disabled={speedIdx === SPEEDS.length - 1}>+</button>
      </div>
    </div>
  );
}
