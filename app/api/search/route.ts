import { NextResponse } from "next/server";
import { searchSongs } from "@/lib/netease";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "请提供搜索关键词" }, { status: 400 });
    }
    const songs = await searchSongs(query.trim());
    return NextResponse.json({ songs });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "搜索失败" },
      { status: 500 }
    );
  }
}
