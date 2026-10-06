import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Dandadan";
  const WORKER = "https://aniwavex-manga-worker.rajverma159310.workers.dev";

  const logs: string[] = [];

  try {
    // 1. Direct WeebCentral search on worker
    logs.push(`Step 1: Calling GET ${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=weebcentral`);
    const wcSearchRes = await fetch(`${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=weebcentral`, {
      cache: "no-store",
    });
    const wcSearchData = await wcSearchRes.json().catch((e) => ({ error: e.message }));
    logs.push(`WeebCentral search status: ${wcSearchRes.status}, data: ${JSON.stringify(wcSearchData)}`);

    // 2. WeebCentral chapters on worker
    if (wcSearchData?.data?.[0]?.id) {
      const wcId = wcSearchData.data[0].id;
      logs.push(`Step 2: Calling GET ${WORKER}/api/manga/weebcentral/${wcId}/chapters`);
      const wcChRes = await fetch(`${WORKER}/api/manga/weebcentral/${wcId}/chapters`, {
        cache: "no-store",
      });
      const wcChData = await wcChRes.json().catch((e) => ({ error: e.message }));
      logs.push(`WeebCentral chapters status: ${wcChRes.status}, count: ${wcChData?.data?.length || 0}`);
    }

    // 3. MangaKakalot search on worker
    logs.push(`Step 3: Calling GET ${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=mangakakalot`);
    const mkSearchRes = await fetch(`${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=mangakakalot`, {
      cache: "no-store",
    });
    const mkSearchData = await mkSearchRes.json().catch((e) => ({ error: e.message }));
    logs.push(`MangaKakalot search status: ${mkSearchRes.status}, data: ${JSON.stringify(mkSearchData)}`);

    // 4. ComicK search on worker
    logs.push(`Step 4: Calling GET ${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=comick`);
    const comickSearchRes = await fetch(`${WORKER}/api/manga/search?q=${encodeURIComponent(title)}&provider=comick`, {
      cache: "no-store",
    });
    const comickSearchData = await comickSearchRes.json().catch((e) => ({ error: e.message }));
    logs.push(`ComicK search status: ${comickSearchRes.status}, data: ${JSON.stringify(comickSearchData)}`);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message,
      logs,
    }, { status: 500 });
  }
}
