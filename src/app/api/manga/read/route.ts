import { NextRequest, NextResponse } from "next/server";
import { getChapterPages } from "@/lib/manga/service";

export async function GET(req: NextRequest) {
  const chapterId = req.nextUrl.searchParams.get("chapterId");

  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId parameter" }, { status: 400 });
  }

  try {
    const data = await getChapterPages(chapterId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
