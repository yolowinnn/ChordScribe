import { TabLine, TabState } from "@/lib/types";

function renderLine(line: TabLine, idx: number) {
  const lyric = line.lyric ?? "";
  const chords = [...(line.chords ?? [])].sort((a, b) => a.pos - b.pos);
  const instrumental = lyric.trim() === "";

  const segs: { chord: string | null; text: string }[] = [];
  if (chords.length === 0) {
    segs.push({ chord: null, text: lyric || "♪" });
  } else {
    if (chords[0].pos > 0) {
      segs.push({ chord: null, text: lyric.slice(0, chords[0].pos) });
    }
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
  const pills: [string, string][] = [
    ["调性", m.key],
    ["变调夹", m.capo],
    ["速度", `${m.bpm} BPM`],
    ["拍号", m.timeSignature],
    ["调弦", m.tuning],
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
            {sec.strumming && <span className="sec-strum">{sec.strumming}</span>}
            {sec.progression?.length > 0 && (
              <span className="sec-prog">
                {sec.progression.map((c, j) => (
                  <b key={j}>{c}</b>
                ))}
              </span>
            )}
          </div>
          {sec.lines?.map((line, j) => renderLine(line, j))}
          {sec.notes && <div className="sec-notes">💡 {sec.notes}</div>}
        </div>
      ))}
    </div>
  );
}
