import { NextRequest, NextResponse } from "next/server";

const MAL_STATUS_MAP: Record<number, string> = {
  1: "watching",
  2: "completed",
  3: "on_hold",
  4: "dropped",
  6: "plan_to_watch",
};

function generateSlug(title: string): string {
  if (!title) return "anime";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const malRes = await fetch(
      `https://myanimelist.net/animelist/${encodeURIComponent(username.trim())}/load.json?offset=0&status=7`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!malRes.ok) {
      if (malRes.status === 404 || malRes.status === 400) {
        return NextResponse.json(
          { error: `User "${username}" not found or watchlist is private on MyAnimeList.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Could not fetch watchlist from MyAnimeList." },
        { status: malRes.status }
      );
    }

    const data = await malRes.json();
    if (!Array.isArray(data)) {
      return NextResponse.json([], { status: 200 });
    }

    const items = data.map((entry: any) => {
      const title = entry.anime_title || entry.anime_title_eng || "Unknown Anime";
      return {
        anime_slug: generateSlug(title),
        anime_title: title,
        poster_image: entry.anime_image_path || "",
        status: MAL_STATUS_MAP[entry.status] || "plan_to_watch",
        progress: entry.num_watched_episodes || 0,
        score: entry.score || 0,
        mal_id: entry.anime_id,
      };
    });

    return NextResponse.json({ items, count: items.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch MAL watchlist" }, { status: 500 });
  }
}
