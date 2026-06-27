import { TabState } from "./types";

export const SYSTEM_PROMPT = `你是一位顶尖的吉他编曲与扒谱师，风格对标中文吉他谱 App「有谱吗」。
你能直接聆听音频，并产出可直接弹唱的吉他谱：调性、变调夹、速度、曲式结构、每个段落的和弦进行、扫弦/分解节奏型，以及和弦在歌词上方的精确对位。

工作原则：
- 仔细聆听给定的完整音频，不要凭歌名臆测。
- 和弦使用标准记号（如 G、Em7、Cadd9、D/F#）。
- 节奏型用箭头或文字描述，如「↓ ↓↑ ↑↓↑」(扫弦) 或「53231323」(分解/Travis picking)。
- 歌词用原唱语言（这首是中文）。chords 数组里的 pos 是该和弦变化对应歌词中的「字符下标」(0 基)，纯前奏/间奏段落 lyric 可为空字符串。
- 每一轮都要在上一轮基础上「修正并加细」，听到的更准就覆盖旧的。
- 始终返回「完整」的 TabState（不是增量），让前端拿到最新全量结果。

严格只输出 JSON，符合给定的 TypeScript schema，不要任何额外文字。`;

const SCHEMA_HINT = `请严格输出如下结构的 JSON：
{
  "meta": { "title": string, "artist": string, "key": string, "capo": string, "bpm": number, "timeSignature": string, "tuning": string },
  "structure": string[],              // 曲式顺序，如 ["Intro","Verse 1","Chorus","Verse 2",...]
  "sections": [
    {
      "name": string,                 // 段落名，需与 structure 对应
      "strumming": string,            // 该段节奏型
      "progression": string[],        // 该段裸和弦进行，如 ["G","D","Em","C"]
      "lines": [
        { "lyric": string, "chords": [ { "chord": string, "pos": number } ] }
      ],
      "notes": string                 // 可选演奏提示
    }
  ],
  "confidence": number,               // 0~1，你对本轮整体准确度的自评
  "done": boolean,                    // 你认为扒谱已完整且准确时设为 true
  "roundSummary": string              // 一句话中文，说明这一轮你做了什么/改了什么
}`;

export function buildRoundPrompt(round: number, prev: TabState | null, hint: string): string {
  if (round === 1 || !prev) {
    return `这是第 1 轮转译。请通读整首音频，先建立「骨架」：
1. 确定 meta：调性 key、是否需要变调夹 capo、速度 bpm、拍号 timeSignature、调弦 tuning（一般标准调弦）。
2. 确定完整曲式 structure（按时间顺序列出所有段落）。
3. 为每个段落给出「初步」的和弦进行 progression 与节奏型 strumming，lines 可先放主要歌词与大致和弦对位（不确定处后续轮次再修）。
4. confidence 给一个保守值，done 设为 false。
${hint ? `\n额外信息（歌曲：${hint}）。\n` : ""}
${SCHEMA_HINT}`;
  }

  return `这是第 ${round} 轮转译（精修轮）。下面是上一轮的结果 JSON，请再次聆听音频并「逐段核对、修正、补全」：
- 重点修正和弦错误（特别是副歌与转调处）、补全缺失歌词与和弦对位、细化每段节奏型。
- 如果某段已经准确，保持不变即可。
- 当你认为整谱已准确完整时，把 done 设为 true，并相应提高 confidence。

上一轮结果：
${JSON.stringify(prev)}

${SCHEMA_HINT}`;
}
