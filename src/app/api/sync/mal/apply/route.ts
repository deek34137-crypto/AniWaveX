import { NextRequest, NextResponse } from "next/server";

const STATUS_TO_MAL: Record<string, string> = {
  watching: "watching",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
  plan_to_watch: "plan_to_watch",
};

export async function POST(req: NextRequest) {
  try {
    const { token, items } = await req.json();

    if (!token || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing token or items" }, { status: 400 });
    }

    let successful = 0;
    let failed = 0;

    for (const item of items) {
      if (item.direction === "in_sync" || item.direction === "import") {
        continue;
      }

      let malId = item.malId;

      // Fallback: Resolve MAL ID by searching MAL API if missing
      if (!malId && item.title) {
        try {
          const searchRes = await fetch(
            `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(item.title)}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const firstResult = searchData?.data?.[0];
            if (firstResult?.node?.id) {
              malId = firstResult.node.id;
            }
          }
        } catch (searchErr) {
          console.error("MAL search error for:", item.title, searchErr);
        }
      }

      if (!malId) {
        failed++;
        continue;
      }

      const malStatus = STATUS_TO_MAL[item.localStatus] || "watching";
      const progress = item.localProgress || 0;

      const bodyParams = new URLSearchParams({
        status: malStatus,
        num_watched_episodes: progress.toString(),
      });

      try {
        const updateRes = await fetch(
          `https://api.myanimelist.net/v2/anime/${malId}/my_list_status`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
          }
        );

        if (updateRes.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch (updateErr) {
        console.error("MAL update error for item:", item.title, updateErr);
        failed++;
      }
    }

    return NextResponse.json({ successful, failed });
  } catch (err: any) {
    console.error("MAL apply error:", err);
    return NextResponse.json({ error: err.message || "Failed to apply MAL sync" }, { status: 500 });
  }
}
