import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Dandadan";
  const WORKER = "https://aniwavex-manga-worker.rajverma159310.workers.dev";

  const logs: string[] = [];

  try {
    logs.push(`Step 1: Calling POST ${WORKER}/api/search for "${title}"`);
    const searchRes = await fetch(`${WORKER}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: title }),
      cache: "no-store",
    });

    logs.push(`Search status: ${searchRes.status}`);
    const searchData = await searchRes.json().catch((e) => ({ error: e.message }));
    const results = searchData?.results || [];
    logs.push(`Found ${results.length} results: ${JSON.stringify(results.map((r: any) => ({ p: r.provider, t: r.title, id: r.id })))}`);

    const chapterResults: any[] = [];
    for (const r of results) {
      logs.push(`Fetching chapters for [${r.provider}] id: ${r.id}...`);
      try {
        const chRes = await fetch(`${WORKER}/api/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: r.provider, id: r.id, url: r.url }),
          cache: "no-store",
        });
        logs.push(`  Chapters status for [${r.provider}]: ${chRes.status}`);
        const chData = await chRes.json().catch((e) => ({ error: e.message }));
        const count = chData?.chapters?.length || 0;
        logs.push(`  Chapters count for [${r.provider}]: ${count}`);
        chapterResults.push({ provider: r.provider, count, sample: chData?.chapters?.slice(0, 2) });
      } catch (err: any) {
        logs.push(`  Error fetching [${r.provider}]: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      chapterResults,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message,
      logs,
    }, { status: 500 });
  }
}
