import { NextRequest, NextResponse } from "next/server";
import { getMangaChapters, getMangaDetails } from "@/lib/manga/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const mangaId = searchParams.get("id") || undefined;
  const romajiTitle = searchParams.get("romajiTitle") || undefined;
  const rawSynonyms = searchParams.get("synonyms");

  if (!title) {
    return NextResponse.json({ success: false, error: "Title parameter required" }, { status: 400 });
  }

  const logs: string[] = [];
  logs.push(`title: ${title}`);
  logs.push(`configuredUrl: ${process.env.NEXT_PUBLIC_MANGA_WORKER_URL || process.env.MANGA_API_URL || 'default'}`);

  let synonyms: string[] | undefined;
  if (rawSynonyms) {
    try {
      synonyms = JSON.parse(rawSynonyms);
    } catch {
      synonyms = rawSynonyms.split(",").map((s) => s.trim()).filter(Boolean);
    }
  } else if (mangaId) {
    try {
      const details = await getMangaDetails(mangaId);
      if (details?.synonyms && details.synonyms.length > 0) {
        synonyms = details.synonyms;
      }
    } catch {
      // Ignore details lookup failure
    }
  }

  try {
    // 1. Test worker search directly from Vercel
    const WORKER = 'https://aniwavex-manga-worker.rajverma159310.workers.dev';
    const postRes = await fetch(`${WORKER}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: title }),
      cache: 'no-store',
    });
    logs.push(`worker /api/search status: ${postRes.status}`);
    const postData = await postRes.json().catch((e) => ({ error: e.message }));
    logs.push(`worker /api/search results count: ${postData?.results?.length || 0}`);
    if (postData?.results?.length > 0) {
      logs.push(`top result: ${postData.results[0].provider} - ${postData.results[0].title} (${postData.results[0].id})`);
    }

    const chapters = await getMangaChapters(title, mangaId, romajiTitle, synonyms);
    logs.push(`getMangaChapters returned: ${chapters.length}`);

    return NextResponse.json({
      success: true,
      chapters,
      count: chapters.length,
      logs,
    });
  } catch (err: any) {
    logs.push(`error: ${err?.message}`);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch chapters",
        chapters: [],
        logs,
      },
      { status: 500 }
    );
  }
}

