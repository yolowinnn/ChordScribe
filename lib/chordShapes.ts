/* 和弦指法库：吉他(6弦, 低E→高e)与尤克里里(4弦, g C E A)。
   frets[]：每根弦的品位，0=空弦，-1=不弹(x)，>0=按第几品(绝对品位)。
   查不到精确指法时，会退化到「同根音的基础三和弦」。 */

export interface ChordShape {
  frets: number[]; // 6 (guitar) or 4 (ukulele)
}

// 把降记号/异名同音统一成升记号根音
const ROOT_NORM: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
  "E#": "F", "B#": "C", Cb: "B", Fb: "E",
};

const GUITAR: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0], Cmaj7: [-1, 3, 2, 0, 0, 0], C7: [-1, 3, 2, 3, 1, 0],
  Cadd9: [-1, 3, 2, 0, 3, 0], Cm: [-1, 3, 5, 5, 4, 3], Csus4: [-1, 3, 3, 0, 1, 1],
  "C#": [-1, 4, 3, 1, 2, 1], "C#m": [-1, 4, 6, 6, 5, 4],
  D: [-1, -1, 0, 2, 3, 2], Dm: [-1, -1, 0, 2, 3, 1], D7: [-1, -1, 0, 2, 1, 2],
  Dmaj7: [-1, -1, 0, 2, 2, 2], Dm7: [-1, -1, 0, 2, 1, 1], Dsus2: [-1, -1, 0, 2, 3, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3], Dadd9: [-1, -1, 0, 2, 3, 0],
  "D#": [-1, 6, 5, 3, 4, 3], "D#m": [-1, 6, 8, 8, 7, 6],
  E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0], E7: [0, 2, 0, 1, 0, 0],
  Em7: [0, 2, 2, 0, 3, 0], Emaj7: [0, 2, 1, 1, 0, 0], Esus4: [0, 2, 2, 2, 0, 0],
  F: [1, 3, 3, 2, 1, 1], Fmaj7: [-1, -1, 3, 2, 1, 0], Fm: [1, 3, 3, 1, 1, 1],
  F7: [1, 3, 1, 2, 1, 1], "F#": [2, 4, 4, 3, 2, 2], "F#m": [2, 4, 4, 2, 2, 2],
  "F#m7": [2, 4, 2, 2, 2, 2],
  G: [3, 2, 0, 0, 0, 3], G7: [3, 2, 0, 0, 0, 1], Gmaj7: [3, 2, 0, 0, 0, 2],
  Gm: [3, 5, 5, 3, 3, 3], Gsus4: [3, 3, 0, 0, 1, 3], Gadd9: [3, 2, 0, 2, 0, 3],
  "G#": [4, 6, 6, 5, 4, 4], "G#m": [4, 6, 6, 4, 4, 4],
  A: [-1, 0, 2, 2, 2, 0], Am: [-1, 0, 2, 2, 1, 0], A7: [-1, 0, 2, 0, 2, 0],
  Amaj7: [-1, 0, 2, 1, 2, 0], Am7: [-1, 0, 2, 0, 1, 0], Asus2: [-1, 0, 2, 2, 0, 0],
  Asus4: [-1, 0, 2, 2, 3, 0], Aadd9: [-1, 0, 2, 4, 2, 0],
  "A#": [-1, 1, 3, 3, 3, 1], "A#m": [-1, 1, 3, 3, 2, 1],
  B: [-1, 2, 4, 4, 4, 2], Bm: [-1, 2, 4, 4, 3, 2], B7: [-1, 2, 1, 2, 0, 2],
  Bm7: [-1, 2, 4, 2, 3, 2], Bdim: [-1, 2, 3, 4, 3, -1],
  // 常见转位/分数和弦
  "D/F#": [2, -1, 0, 2, 3, 2], "G/B": [-1, 2, 0, 0, 0, 3], "C/G": [3, 3, 2, 0, 1, 0],
  "C/E": [0, 3, 2, 0, 1, 0], "Am/G": [3, 0, 2, 2, 1, 0], "G/D": [-1, -1, 0, 0, 0, 3],
  "A/C#": [-1, 4, 2, 2, 2, 0], "E/G#": [4, 2, 2, 1, 0, 0], "F/A": [-1, 0, 3, 2, 1, 1],
};

const UKULELE: Record<string, number[]> = {
  C: [0, 0, 0, 3], Cmaj7: [0, 0, 0, 2], C7: [0, 0, 0, 1], Cm: [0, 3, 3, 3],
  Cadd9: [0, 2, 0, 3], Csus4: [0, 0, 1, 3],
  "C#": [1, 1, 1, 4], "C#m": [1, 1, 0, 0],
  D: [2, 2, 2, 0], Dm: [2, 2, 1, 0], D7: [2, 2, 2, 3], Dmaj7: [2, 2, 2, 4],
  Dm7: [2, 2, 1, 3], Dsus4: [0, 2, 3, 0],
  "D#": [0, 3, 3, 1],
  E: [4, 4, 4, 2], Em: [0, 4, 3, 2], E7: [1, 2, 0, 2], Em7: [0, 2, 0, 2],
  F: [2, 0, 1, 0], Fmaj7: [2, 4, 1, 3], Fm: [1, 0, 1, 3], F7: [2, 3, 1, 0],
  "F#": [3, 1, 2, 1], "F#m": [2, 1, 2, 0],
  G: [0, 2, 3, 2], G7: [0, 2, 1, 2], Gmaj7: [0, 2, 2, 2], Gm: [0, 2, 3, 1],
  Gsus4: [0, 2, 3, 3],
  "G#": [5, 3, 4, 3], "G#m": [4, 3, 4, 2],
  A: [2, 1, 0, 0], Am: [2, 0, 0, 0], A7: [0, 1, 0, 0], Amaj7: [1, 1, 0, 0],
  Am7: [0, 0, 0, 0], Asus4: [2, 2, 0, 0], Aadd9: [2, 1, 0, 2],
  "A#": [3, 2, 1, 1], "A#m": [3, 1, 1, 1],
  B: [4, 3, 2, 2], Bm: [4, 2, 2, 2], B7: [2, 3, 2, 2], Bm7: [2, 2, 2, 2],
  "D/F#": [2, 2, 2, 0], "G/B": [0, 2, 3, 2],
};

function splitChord(name: string): { root: string; rest: string; bass?: string } {
  const [main, bass] = name.split("/");
  const m = main.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return { root: main, rest: "" };
  let root = m[1];
  if (ROOT_NORM[root]) root = ROOT_NORM[root];
  return { root: root + (root !== m[1] ? "" : ""), rest: m[2], bass };
}

function normalizeName(name: string): string {
  const { root, rest } = splitChord(name);
  return root + rest;
}

/** 查指法；查不到精确和弦时退化到根音的大/小三和弦。返回 null 表示无图。 */
export function lookupShape(
  name: string,
  instrument: "guitar" | "ukulele"
): ChordShape | null {
  const db = instrument === "guitar" ? GUITAR : UKULELE;
  const clean = name.trim();
  // 1) 原名（含分数和弦）
  if (db[clean]) return { frets: db[clean] };
  // 2) 升降记号归一
  const norm = normalizeName(clean);
  if (db[norm]) return { frets: db[norm] };
  // 3) 去掉转位低音
  const noBass = norm.split("/")[0];
  if (db[noBass]) return { frets: db[noBass] };
  // 4) 退化到根音三和弦（小和弦保留 m）
  const { root, rest } = splitChord(noBass);
  const isMinor = /^m(?!aj)/.test(rest);
  const base = root + (isMinor ? "m" : "");
  if (db[base]) return { frets: db[base] };
  if (db[root]) return { frets: db[root] };
  return null;
}
