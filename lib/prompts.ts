import { TabState } from "./types";
import { InstrumentId, getInstrument } from "./instruments";

const SCHEMA_HINT = `严格只输出符合以下结构的 JSON（不要任何额外文字、不要 markdown 代码块）：
{
  "meta": { "title": string, "artist": string, "instrument": string, "key": string, "capo": string, "bpm": number, "timeSignature": string, "tuning": string, "difficulty": string },
  "structure": string[],
  "sections": [
    {
      "name": string,
      "pattern": string,         // 节奏/演奏型
      "progression": string[],   // 和弦进行（和弦型乐器；旋律乐器可留空数组）
      "lines": [ { "lyric": string, "chords": [ { "chord": string, "pos": number } ] } ],
      "tab": string,             // ASCII 六线/四线谱（可选，多行用 \\n）
      "melody": string,          // 旋律音名序列（可选）
      "notes": string
    }
  ],
  "confidence": number,
  "done": boolean,
  "roundSummary": string
}
说明：chords[].pos 是该和弦对应歌词中的字符下标(0 基)；纯前奏/间奏 lyric 可为空字符串。`;

const INSTRUMENT_GUIDE: Record<InstrumentId, string> = {
  guitar: `乐器=吉他。重点产出：
- progression：每段的和弦进行（标准记号 G、Em7、Cadd9、D/F#）。
- pattern：扫弦或分解节奏型，如「↓ ↓↑ ↑↓↑」或分解「T 1 2 3 1 2」。
- lines：把和弦精确对位到歌词上方。
- capo：判断是否需要变调夹。tab：前奏/间奏可给六线谱 riff（可选）。`,
  ukulele: `乐器=尤克里里(GCEA 四弦)。重点产出：
- progression：尤克里里和弦（C、Am、F、G7 等，按 uke 把位）。
- pattern：尤克里里扫弦型，如「D DU UDU」或切分。
- lines：和弦对位歌词。capo 通常「无变调夹」。`,
  bass: `乐器=贝斯(4 弦 EADG)。重点产出：
- progression：每段根音/和弦走向（如 G - D - Em - C）。
- pattern：律动描述（如「根音为主，副歌加八度与经过音，略带切分」）。
- tab：四线谱 ASCII，给出每段主要 bass line（弦从上到下 G D A E），用品格数字与 - 表示时值，多行 \\n。
- lines 可留空；melody 可选给低音走向音名。`,
  piano: `乐器=钢琴。重点产出：
- progression：每段和弦。
- pattern：左手伴奏型（如「分解 1-5-8-3」「柱式和弦」「八度根音」）。
- lines：和弦对位歌词（弹唱用）。
- melody：右手主旋律音名+节奏（如「E E F G | G F E D」）。`,
  violin: `乐器=小提琴(GDAE)。重点产出：
- melody：每段主旋律的音名序列+节奏（如「A4 B4 C5 | D5 - -」），用 | 分小节。
- pattern：弓法/奏法（连弓、分弓、跳弓）。
- notes：把位/换把与指法提示。progression/lines 可留空。`,
  cello: `乐器=大提琴(CGDA)。重点产出：
- melody：每段旋律或低音线的音名序列+节奏，用 | 分小节。
- pattern：弓法/奏法。notes：把位与指法提示。progression/lines 可留空。`,
};

export function systemPrompt(instrument: InstrumentId): string {
  const ins = getInstrument(instrument);
  return `你是一位顶尖的${ins.label}编曲与扒谱师，风格对标中文乐谱 App「有谱吗」。
你能直接聆听音频，并产出可直接演奏的${ins.label}谱：调性、速度、曲式结构，以及每个段落的演奏内容。

工作原则：
- 仔细聆听给定的完整音频，不要凭歌名臆测。
- 每一轮都在上一轮基础上「修正并加细」，听到的更准就覆盖旧的。
- 始终返回「完整」的 TabState（不是增量），让前端拿到最新全量结果。
- 歌词用原唱语言（中文歌就用中文）。

${INSTRUMENT_GUIDE[instrument]}

严格只输出 JSON。`;
}

export function userPrompt(
  round: number,
  prev: TabState | null,
  hint: string,
  instrument: InstrumentId
): string {
  const ins = getInstrument(instrument);
  if (round === 1 || !prev) {
    return `这是第 1 轮转译（${ins.label}）。先建立「骨架」：
1. 确定 meta：instrument="${instrument}"、调性 key、速度 bpm、拍号 timeSignature、调弦 tuning（默认「${ins.tuning}」）、变调夹 capo、难度 difficulty。
2. 确定完整曲式 structure（按时间顺序）。
3. 为每个段落给出初步内容（见下方该乐器的重点字段），不确定处后续轮次再修。
4. confidence 给保守值，done=false。
${hint ? `\n歌曲信息：${hint}\n` : ""}
${SCHEMA_HINT}`;
  }
  return `这是第 ${round} 轮转译（${ins.label} 精修轮）。下面是上一轮结果，请再次聆听音频，逐段核对、修正、补全：
- 重点修正错误（尤其副歌与转调处）、补全缺失内容、细化每段演奏型/节奏。
- 已准确的段落保持不变。
- 认为整谱已准确完整时把 done 设为 true，并相应提高 confidence。

上一轮结果：
${JSON.stringify(prev)}

${SCHEMA_HINT}`;
}

/** 构建发往 /api/round 的完整 Vertex generateContent 请求体（含内联音频）。 */
export function buildRoundBody(
  round: number,
  prev: TabState | null,
  hint: string,
  instrument: InstrumentId,
  audioB64: string
) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt(instrument) }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt(round, prev, hint, instrument) },
          { inlineData: { mimeType: "audio/mpeg", data: audioB64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 65535,
      responseMimeType: "application/json",
    },
  };
}
