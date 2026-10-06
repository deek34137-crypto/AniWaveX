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

  const debug: any = {};
  debug.configuredUrl = process.env.NEXT_PUBLIC_MANGA_WORKER_URL || process.env.MANGA_API_URL;
  debug.title = title;

  try {
    const chapters = await getMangaChapters(title, mangaId, romajiTitle);
    return NextResponse.json({
      success: true,
      chapters,
      count: chapters.length,
      debug,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch chapters",
        chapters: [],
        debug,
      },
      { status: 500 }
    );
  }
}

