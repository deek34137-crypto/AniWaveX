import { NextResponse } from "next/server";
import { getAnimeData, fetchKitsuEpisodeRange } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const animeIdParam = searchParams.get("animeId");
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100));

  let animeId = animeIdParam;

  if (!animeId) {
    const data = await getAnimeData(slug);
    if (!data) {
      return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }
    animeId = data.animeId || data.id;
  }

  if (!animeId) {
    return NextResponse.json({ error: "Invalid anime ID" }, { status: 400 });
  }

  const result = await fetchKitsuEpisodeRange(animeId, offset, limit);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
