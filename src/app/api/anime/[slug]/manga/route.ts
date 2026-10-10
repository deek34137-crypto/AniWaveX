import { NextRequest, NextResponse } from "next/server";
import { getAnimeData } from "@/lib/api";
import { getMangaAdaptation } from "@/lib/manga/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug required" }, { status: 400 });
  }

  try {
    const anime = await getAnimeData(slug);
    if (!anime) {
      return NextResponse.json({ success: false, error: "Anime not found" }, { status: 404 });
    }

    const manga = await getMangaAdaptation(anime.title, anime.anilistId);
    return NextResponse.json({
      success: true,
      data: manga,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve manga adaptation" },
      { status: 500 }
    );
  }
}
