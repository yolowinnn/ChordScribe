export interface SongCandidate {
  id: number;
  name: string;
  artists: string;
  album: string;
  durationMs: number;
}

export interface ChordMark {
  // chord symbol, e.g. "G", "Em7", "Cadd9"
  chord: string;
  // character index in the lyric where the chord change happens (0-based)
  pos: number;
}

export interface TabLine {
  lyric: string;
  chords: ChordMark[];
}

export interface TabSection {
  // e.g. "Intro", "Verse 1", "Chorus", "Bridge", "Outro"
  name: string;
  // strumming / picking pattern description, e.g. "↓ ↓↑ ↑↓↑" or "T 1 2 3"
  strumming: string;
  // bare chord progression for the section, e.g. ["G","D","Em","C"]
  progression: string[];
  lines: TabLine[];
  notes?: string;
}

export interface TabMeta {
  title: string;
  artist: string;
  key: string;        // e.g. "G major"
  capo: string;       // e.g. "Capo 2" or "无变调夹"
  bpm: number;
  timeSignature: string; // e.g. "4/4"
  tuning: string;     // e.g. "标准调弦 EADGBE"
}

export interface TabState {
  meta: TabMeta;
  structure: string[];      // ordered list of section names
  sections: TabSection[];
  confidence: number;       // 0-1, model's self-assessed confidence
  done: boolean;            // model says transcription is complete
  roundSummary: string;     // what this round did, shown in the progress log
}
