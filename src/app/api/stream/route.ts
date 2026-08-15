import { NextResponse } from "next/server";
import { multiProvider } from "@/lib/providers/reanime";
import { getAnikotoStream, getAnilistId } from "@/lib/providers/anikoto-wrapper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ep = searchParams.get("ep");
  const title = searchParams.get("title");
  const type = searchParams.get("type"); // e.g., 'movie', 'TV'
  const audio = searchParams.get("audio") || 'sub';

  if (!id || !ep || !title) {
    return NextResponse.json({ error: "Missing required parameters (id, ep, title)" }, { status: 400 });
  }

  try {
    // 1. Try to fetch native HLS stream from AnikotoProvider
    const anikotoRes = await getAnikotoStream(title, parseInt(ep, 10), audio as 'sub' | 'dub');
    if (anikotoRes && anikotoRes.streams) {
      // Filter out the HLS stream since FlixCloud blocks client-side requests with 403 Forbidden
      // Instead, we use their iframe embeds which work perfectly
      const embedSources = anikotoRes.streams
        .filter((s: any) => s.type === "embed" && s.url)
        .map((s: any) => ({
          url: s.url,
          quality: s.server || "Auto",
          isM3U8: false
        }));

      if (embedSources.length > 0) {
        return NextResponse.json({
          sources: embedSources,
          sub: audio === 'sub' ? embedSources : [],
          dub: audio === 'dub' ? embedSources : [],
          // Don't return nativeStream because browser fetch is blocked by Cloudflare
        });
      }
    }

    // 2. Fallback to FilmU
    const anilistIdStr = await getAnilistId(title);
    const anilistId = anilistIdStr ? Number(anilistIdStr) : undefined;
    const fallbackStream = await multiProvider.getStreamInfo(id, parseInt(ep, 10), title, anilistId);
    
    if (fallbackStream && fallbackStream.sources && fallbackStream.sources.length > 0) {
      return NextResponse.json(fallbackStream);
    }

    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stream" }, { status: 500 });
  }
}
