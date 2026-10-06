import { NextRequest, NextResponse } from "next/server";

const MAL_STATUS_MAP: Record<string, string> = {
  watching: "watching",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
  plan_to_watch: "plan_to_watch",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization");
    const token =
      body.token ||
      (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "") ||
      body.username;

    if (!token) {
      return NextResponse.json({ error: "Missing MyAnimeList token or username" }, { status: 400 });
    }

    // 1. Try querying MAL v2 OAuth endpoint
    const malRes = await fetch(
      "https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status{num_episodes_watched,status,score},main_picture&limit=1000",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (malRes.ok) {
      const data = await malRes.json();
      const rawItems = data?.data || [];
      const items = rawItems.map((entry: any) => {
        const node = entry.node || {};
        const listStatus = entry.list_status || {};
        const title = node.title || "Anime";
        return {
          id: node.id,
          title,
          posterImage: node.main_picture?.large || node.main_picture?.medium || "",
          status: MAL_STATUS_MAP[listStatus.status] || listStatus.status || "watching",
          progress: listStatus.num_episodes_watched || 0,
        };
      });

      return NextResponse.json({ items, count: items.length });
    }

    // 2. Fallback: If token was passed as username (or token failed but matches a username)
    const username = body.username || token;
    const fallbackRes = await fetch(
      `https://myanimelist.net/animelist/${encodeURIComponent(username.trim())}/load.json?offset=0&status=7`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      }
    );

    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (Array.isArray(data)) {
        const NUM_STATUS_MAP: Record<number, string> = {
          1: "watching",
          2: "completed",
          3: "on_hold",
          4: "dropped",
          6: "plan_to_watch",
        };

        const items = data.map((entry: any) => ({
          id: entry.anime_id,
          title: entry.anime_title || entry.anime_title_eng || "Anime",
          posterImage: entry.anime_image_path || "",
          status: NUM_STATUS_MAP[entry.status] || "watching",
          progress: entry.num_watched_episodes || 0,
        }));

        return NextResponse.json({ items, count: items.length });
      }
    }

    return NextResponse.json(
      { error: "Could not fetch MyAnimeList entries. Please verify your token or account credentials." },
      { status: malRes.status || 400 }
    );
  } catch (err: any) {
    console.error("MAL list fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch MAL entries" }, { status: 500 });
  }
}
