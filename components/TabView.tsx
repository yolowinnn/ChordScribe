import { TabLine, TabState } from "@/lib/types";

function renderLine(line: TabLine, idx: number) {
  const lyric = line.lyric ?? "";
  const chords = [...(line.chords ?? [])].sort((a, b) => a.pos - b.pos);
  const instrumental = lyric.trim() === "";

  // Build positioned segments: each segment carries its lyric chunk plus the
  // chord that sits above its first character.
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
  return (
    <div className="sheet">
      <div className="metabar">
        <div className="t">
          {m.title}
          <small>{m.artist}</small>
        </div>
        <div className="kv">
          <span>调性</span>
          <b>{m.key}</b>
        </div>
        <div className="kv">
          <span>变调夹</span>
          <b>{m.capo}</b>
        </div>
        <div className="kv">
          <span>速度</span>
          <b>{m.bpm} BPM</b>
        </div>
        <div className="kv">
          <span>拍号</span>
          <b>{m.timeSignature}</b>
        </div>
        <div className="kv">
          <span>调弦</span>
          <b>{m.tuning}</b>
        </div>
      </div>

      {state.sections?.map((sec, i) => (
        <div className="section" key={i}>
          <div className="shead">
            <span className="sname">{sec.name}</span>
            {sec.strumming && <span className="strum">{sec.strumming}</span>}
            {sec.progression?.length > 0 && (
              <span className="prog">{sec.progression.join("  ·  ")}</span>
            )}
          </div>
          {sec.lines?.map((line, j) => renderLine(line, j))}
          {sec.notes && <div className="snotes">💡 {sec.notes}</div>}
        </div>
      ))}
    </div>
  );
}
