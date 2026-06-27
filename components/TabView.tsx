import { TabLine, TabState } from "@/lib/types";
import { getInstrument } from "@/lib/instruments";

function renderLine(line: TabLine, idx: number) {
  const lyric = line.lyric ?? "";
  const chords = [...(line.chords ?? [])].sort((a, b) => a.pos - b.pos);
  const instrumental = lyric.trim() === "";

  const segs: { chord: string | null; text: string }[] = [];
  if (chords.length === 0) {
    segs.push({ chord: null, text: lyric || "♪" });
  } else {
    if (chords[0].pos > 0) segs.push({ chord: null, text: lyric.slice(0, chords[0].pos) });
    for (let i = 0; i < chords.length; i++) {
      const start = Math.max(0, chords[i].pos);
      const end = i + 1 < chords.length ? chords[i + 1].pos : lyric.length;
      const text = lyric.slice(start, end) || (instrumental ? "·" : " ");
      segs.push({ chord: chords[i].chord, text });
    }
  }

  return (
    <div className={`line${instrumental ? " instrumental" : ""}`} key={idx}>
      <div className="row">
        {segs.map((s, i) => (
          <div className="seg" key={i}>
            <span className="c">{s.chord ?? ""}</span>
            <span className="l">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TabView({ state }: { state: TabState }) {
  const m = state.meta;
  const ins = getInstrument(m.instrument);
  const isChord = ins.family === "chord";
  const pills: [string, string][] = [
    ["乐器", `${ins.emoji} ${ins.label}`],
    ["调性", m.key],
    ...(m.instrument === "guitar" || m.instrument === "ukulele"
      ? ([["变调夹", m.capo]] as [string, string][])
      : []),
    ["速度", `${m.bpm} BPM`],
    ["拍号", m.timeSignature],
    ["调弦", m.tuning],
    ...(m.difficulty ? ([["难度", m.difficulty]] as [string, string][]) : []),
  ];

  return (
    <div className="sheet">
      <div className="metabar">
        <div className="ttl">{m.title}</div>
        <div className="art">{m.artist}</div>
        <div className="meta-pills">
          {pills.map(([k, v]) => (
            <div className="meta-pill" key={k}>
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {state.sections?.map((sec, i) => (
        <div className="section-card" key={i}>
          <div className="sec-head">
            <span className="sec-name">{sec.name}</span>
            {sec.pattern && <span className="sec-strum">{sec.pattern}</span>}
            {sec.progression?.length > 0 && (
              <span className="sec-prog">
                {sec.progression.map((c, j) => (
                  <b key={j}>{c}</b>
                ))}
              </span>
            )}
          </div>

          {isChord && sec.lines?.length > 0 &&
            sec.lines.map((line, j) => renderLine(line, j))}

          {sec.melody && (
            <div className="melody">
              <span className="blk-label">旋律</span>
              <div className="melody-body">{sec.melody}</div>
            </div>
          )}

          {sec.tab && (
            <div className="tabblock">
              <span className="blk-label">{m.instrument === "bass" ? "四线谱" : "六线谱"}</span>
              <pre>{sec.tab}</pre>
            </div>
          )}

          {sec.notes && <div className="sec-notes">💡 {sec.notes}</div>}
        </div>
      ))}
    </div>
  );
}
