/* 从和弦名推算音级（pitch class 0-11，C=0），用于钢琴键盘高亮。 */

const NOTE_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, "E#": 5, Fb: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10,
  B: 11, "B#": 0, Cb: 11,
};

// 各和弦品质对应的半音音程（相对根音）
const QUALITIES: { test: RegExp; intervals: number[] }[] = [
  { test: /^maj7|^M7/, intervals: [0, 4, 7, 11] },
  { test: /^maj9/, intervals: [0, 4, 7, 11, 14] },
  { test: /^m7b5|^ø/, intervals: [0, 3, 6, 10] },
  { test: /^m7|^min7/, intervals: [0, 3, 7, 10] },
  { test: /^m9|^min9/, intervals: [0, 3, 7, 10, 14] },
  { test: /^m6|^min6/, intervals: [0, 3, 7, 9] },
  { test: /^mmaj7|^mM7/, intervals: [0, 3, 7, 11] },
  { test: /^m(?!aj)|^min/, intervals: [0, 3, 7] },
  { test: /^dim7/, intervals: [0, 3, 6, 9] },
  { test: /^dim|^°/, intervals: [0, 3, 6] },
  { test: /^aug|^\+/, intervals: [0, 4, 8] },
  { test: /^sus2/, intervals: [0, 2, 7] },
  { test: /^sus4|^sus/, intervals: [0, 5, 7] },
  { test: /^add9/, intervals: [0, 4, 7, 14] },
  { test: /^6\/9|^69/, intervals: [0, 4, 7, 9, 14] },
  { test: /^6/, intervals: [0, 4, 7, 9] },
  { test: /^9/, intervals: [0, 4, 7, 10, 14] },
  { test: /^7sus4/, intervals: [0, 5, 7, 10] },
  { test: /^7/, intervals: [0, 4, 7, 10] },
  { test: /^maj|^M(?!7)/, intervals: [0, 4, 7] },
];

export interface ChordNotes {
  root: number; // pitch class of root
  bass?: number; // pitch class of bass (slash chord)
  pcs: number[]; // all pitch classes in the chord
}

export function chordToNotes(name: string): ChordNotes | null {
  const clean = name.trim();
  const [main, bassName] = clean.split("/");
  const m = main.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return null;
  const root = NOTE_TO_PC[m[1]];
  if (root == null) return null;
  const rest = m[2].trim();
  let intervals = [0, 4, 7]; // 默认大三和弦
  if (rest) {
    const q = QUALITIES.find((x) => x.test.test(rest));
    if (q) intervals = q.intervals;
  }
  const pcs = Array.from(new Set(intervals.map((i) => (root + i) % 12)));
  let bass: number | undefined;
  if (bassName) {
    const bm = bassName.match(/^([A-G][#b]?)/);
    if (bm && NOTE_TO_PC[bm[1]] != null) {
      bass = NOTE_TO_PC[bm[1]];
      if (!pcs.includes(bass)) pcs.push(bass);
    }
  }
  return { root, bass, pcs };
}
