import { NextRequest, NextResponse } from "next/server";
import { getMangaChapters } from "@/lib/manga/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const title = searchParams.get("title");
  const romaji = searchParams.get("romaji") || undefined;

  if (!title) {
    return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
  }

  try {
    const chapters = await getMangaChapters(title, id || undefined, romaji);
    return NextResponse.json({
      success: true,
      chaptersCount: chapters.length,
      chapters,
      debug: {
        title,
        id,
        romaji,
        backendEnv: process.env.NEXT_PUBLIC_MANGA_WORKER_URL || null,
        mangaApiUrl: process.env.MANGA_API_URL || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
