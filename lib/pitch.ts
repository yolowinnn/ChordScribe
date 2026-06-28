/* 单音基频检测（自相关法）+ 音名/音分换算，用于麦克风调音。 */

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 自相关法估算基频(Hz)；信号太弱返回 -1。基于 cwilso 的 ACF2+ 实现。 */
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // 太安静

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const b = buf.subarray(r1, r2);
  const N = b.length;
  const c = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let j = 0; j < N - i; j++) sum += b[j] * b[j + i];
    c[i] = sum;
  }
  let d = 0;
  while (d < N - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < N; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return -1;
  // 抛物线插值，提高精度
  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sampleRate / T0;
}

export interface NoteReading {
  freq: number;
  noteNum: number; // MIDI 音高号
  name: string; // 音名（不含八度）
  octave: number;
  fullName: string; // 如 E2
  cents: number; // 与最近半音的偏差（-50~+50）
}

export function freqToNote(freq: number): NoteReading {
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  const rounded = Math.round(noteNum);
  const refFreq = 440 * Math.pow(2, (rounded - 69) / 12);
  const cents = Math.floor(1200 * Math.log2(freq / refFreq));
  const name = NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { freq, noteNum: rounded, name, octave, fullName: `${name}${octave}`, cents };
}

/** 在给定目标音(MIDI号)集合里找最接近当前频率的那个，返回其索引与音分差。 */
export function nearestTarget(freq: number, targetFreqs: number[]): { idx: number; cents: number } {
  let best = 0;
  let bestAbs = Infinity;
  let bestCents = 0;
  for (let i = 0; i < targetFreqs.length; i++) {
    const cents = 1200 * Math.log2(freq / targetFreqs[i]);
    if (Math.abs(cents) < bestAbs) { bestAbs = Math.abs(cents); best = i; bestCents = cents; }
  }
  return { idx: best, cents: Math.round(bestCents) };
}
