import { InstrumentId } from "@/lib/instruments";
import { lookupShape } from "@/lib/chordShapes";
import { chordToNotes } from "@/lib/chordNotes";

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
];

function Keyboard({ name }: { name: string }) {
  const notes = chordToNotes(name);
  const ww = 12, wh = 46, bw = 8, bh = 28, octaves = 2;
  const whites = octaves * 7;
  const width = whites * ww;
  const pcs = notes?.pcs || [];
  const root = notes?.root;
  return (
    <svg viewBox={`0 0 ${width} ${wh + 2}`} width={width} height={wh + 2}>
      {Array.from({ length: whites }).map((_, i) => {
        const pc = WHITE_PCS[i % 7];
        const on = pcs.includes(pc);
        const isRoot = pc === root;
        return (
          <rect key={i} x={i * ww} y={0} width={ww - 1} height={wh} rx={2}
            fill={on ? (isRoot ? "var(--amber)" : "var(--teal)") : "#f4f4f6"}
            stroke="#0a0a0f" strokeWidth="0.5" />
        );
      })}
      {Array.from({ length: octaves }).map((_, oct) =>
        BLACK.map((b) => {
          const x = (oct * 7 + b.after) * ww + ww - bw / 2;
          const on = pcs.includes(b.pc);
          const isRoot = b.pc === root;
          return (
            <rect key={`${oct}-${b.pc}`} x={x} y={0} width={bw} height={bh} rx={1.5}
              fill={on ? (isRoot ? "var(--amber)" : "var(--teal)") : "#16171d"}
              stroke="#0a0a0f" strokeWidth="0.5" />
          );
        })
      )}
    </svg>
  );
}

function Fretboard({ name, instrument }: { name: string; instrument: "guitar" | "ukulele" }) {
  const shape = lookupShape(name, instrument);
  if (!shape) return <div className="cd-none">无图</div>;
  const frets = shape.frets;
  const N = frets.length;
  const positives = frets.filter((f) => f > 0);
  const maxF = positives.length ? Math.max(...positives) : 0;
  const minF = positives.length ? Math.min(...positives) : 0;
  const startFret = maxF > 4 ? minF : 1;
  const ROWS = 4;
  const colGap = 13, rowGap = 16, padX = 9, padTop = 16, padBottom = 6;
  const gridW = (N - 1) * colGap;
  const gridH = ROWS * rowGap;
  const W = gridW + padX * 2;
  const H = padTop + gridH + padBottom;
  const sx = (i: number) => padX + i * colGap;
  const muted = "var(--faint)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {/* nut or position label */}
      {startFret === 1 ? (
        <rect x={padX} y={padTop - 2} width={gridW} height={3} fill="var(--text)" />
      ) : (
        <text x={padX - 4} y={padTop + rowGap - 4} fontSize="8" fill="var(--muted)" textAnchor="end">{startFret}fr</text>
      )}
      {/* fret lines */}
      {Array.from({ length: ROWS + 1 }).map((_, r) => (
        <line key={r} x1={padX} y1={padTop + r * rowGap} x2={padX + gridW} y2={padTop + r * rowGap} stroke="var(--border-strong)" strokeWidth="0.8" />
      ))}
      {/* strings */}
      {Array.from({ length: N }).map((_, i) => (
        <line key={i} x1={sx(i)} y1={padTop} x2={sx(i)} y2={padTop + gridH} stroke="var(--border-strong)" strokeWidth="0.8" />
      ))}
      {/* markers + dots */}
      {frets.map((f, i) => {
        if (f === -1) return <text key={i} x={sx(i)} y={padTop - 6} fontSize="9" fill={muted} textAnchor="middle">×</text>;
        if (f === 0) return <circle key={i} cx={sx(i)} cy={padTop - 8} r={3} fill="none" stroke="var(--muted)" strokeWidth="1" />;
        const row = f - startFret + 1;
        const cy = padTop + (row - 0.5) * rowGap;
        return <circle key={i} cx={sx(i)} cy={cy} r={4.2} fill="var(--amber)" />;
      })}
    </svg>
  );
}

export default function ChordDiagram({ name, instrument }: { name: string; instrument: InstrumentId }) {
  let body = null;
  if (instrument === "guitar" || instrument === "ukulele") body = <Fretboard name={name} instrument={instrument} />;
  else if (instrument === "piano") body = <Keyboard name={name} />;
  else return null;
  return (
    <div className="chorddiagram">
      <div className="cd-art">{body}</div>
      <div className="cd-name">{name}</div>
    </div>
  );
}
