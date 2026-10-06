import { NextRequest, NextResponse } from "next/server";
import { getMangaChapters } from "@/lib/manga/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const mangaId = searchParams.get("id") || undefined;
  const romajiTitle = searchParams.get("romajiTitle") || undefined;

  if (!title) {
    return NextResponse.json({ success: false, error: "Title parameter required" }, { status: 400 });
  }

  try {
    const chapters = await getMangaChapters(title, mangaId, romajiTitle);
    return NextResponse.json({
      success: true,
      chapters,
      count: chapters.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch chapters",
        chapters: [],
      },
      { status: 500 }
    );
  }
}

