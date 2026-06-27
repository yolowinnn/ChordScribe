import { InstrumentId } from "./instruments";

export interface SongCandidate {
  id: number;
  name: string;
  artists: string;
  album: string;
  durationMs: number;
}

export interface ChordMark {
  chord: string; // e.g. "G", "Em7", "Cadd9", "D/F#"
  pos: number; // character index in the lyric where the chord change happens
}

export interface TabLine {
  lyric: string;
  chords: ChordMark[];
}

export interface TabSection {
  name: string; // "Intro", "Verse 1", "Chorus", "Bridge", "Outro"
  pattern: string; // 节奏/演奏型：扫弦/分解/律动/弓法
  progression: string[]; // 和弦进行（和弦型乐器）
  lines: TabLine[]; // 和弦-歌词对位（和弦型乐器）
  tab?: string; // ASCII 六线/四线谱 riff（吉他/贝斯）
  melody?: string; // 旋律音名序列（钢琴右手/小提琴/大提琴）
  notes?: string;
}

export interface TabMeta {
  title: string;
  artist: string;
  instrument: InstrumentId;
  key: string; // "A major"
  capo: string; // "Capo 2" / "无变调夹" / "—"
  bpm: number;
  timeSignature: string; // "4/4"
  tuning: string; // "标准调弦 EADGBE"
  difficulty?: string; // "入门" / "进阶" 等
}

export interface TabState {
  meta: TabMeta;
  structure: string[];
  sections: TabSection[];
  confidence: number;
  done: boolean;
  roundSummary: string;
}
