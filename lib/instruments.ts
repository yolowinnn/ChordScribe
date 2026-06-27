export type InstrumentId =
  | "guitar"
  | "ukulele"
  | "bass"
  | "piano"
  | "violin"
  | "cello";

export interface Instrument {
  id: InstrumentId;
  label: string; // 中文名
  en: string;
  emoji: string;
  tuning: string; // 默认调弦/说明
  family: "chord" | "melody"; // 和弦型 / 旋律型
  primary: boolean; // 是否常用主推
  tagline: string;
  accent: string; // 主题色
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: "guitar",
    label: "吉他",
    en: "Guitar",
    emoji: "🎸",
    tuning: "标准调弦 EADGBE",
    family: "chord",
    primary: true,
    tagline: "和弦 + 扫弦/分解节奏型 + 歌词对位",
    accent: "#f5b642",
  },
  {
    id: "ukulele",
    label: "尤克里里",
    en: "Ukulele",
    emoji: "🌺",
    tuning: "标准调弦 GCEA",
    family: "chord",
    primary: true,
    tagline: "尤克里里和弦 + 扫弦型 + 歌词对位",
    accent: "#34d399",
  },
  {
    id: "bass",
    label: "贝斯",
    en: "Bass",
    emoji: "🎚️",
    tuning: "标准调弦 EADG（4 弦）",
    family: "chord",
    primary: true,
    tagline: "Bass line 根音走向 + 律动 + 四线谱",
    accent: "#56b8ff",
  },
  {
    id: "piano",
    label: "钢琴",
    en: "Piano",
    emoji: "🎹",
    tuning: "—",
    family: "chord",
    primary: true,
    tagline: "和弦 + 左手伴奏型 + 右手旋律提示",
    accent: "#c084fc",
  },
  {
    id: "violin",
    label: "小提琴",
    en: "Violin",
    emoji: "🎻",
    tuning: "GDAE",
    family: "melody",
    primary: false,
    tagline: "主旋律音名 + 节奏 + 弓法/把位",
    accent: "#fb7185",
  },
  {
    id: "cello",
    label: "大提琴",
    en: "Cello",
    emoji: "🎻",
    tuning: "CGDA",
    family: "melody",
    primary: false,
    tagline: "旋律/低音线 音名 + 弓法",
    accent: "#fbbf24",
  },
];

export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0];
}
