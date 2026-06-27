import { NextResponse } from "next/server";
import { downloadAudio } from "@/lib/netease";
import { geminiJSON } from "@/lib/vertex";
import { SYSTEM_PROMPT, buildRoundPrompt } from "@/lib/prompts";
import { TabState } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 单轮 Gemini 分析整首歌可能较慢

export async function POST(req: Request) {
  try {
    const { songId, round, prevState, hint } = await req.json();
    if (!songId || typeof round !== "number") {
      return NextResponse.json(
        { error: "缺少 songId 或 round 参数" },
        { status: 400 }
      );
    }

    const audio = await downloadAudio(Number(songId));
    const b64 = audio.toString("base64");

    const userPrompt = buildRoundPrompt(
      round,
      (prevState as TabState) || null,
      hint || ""
    );

    const state: TabState = await geminiJSON(SYSTEM_PROMPT, [
      { text: userPrompt },
      { inlineData: { mimeType: "audio/mpeg", data: b64 } },
    ]);

    return NextResponse.json({ round, state });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "转译失败" },
      { status: 500 }
    );
  }
}
