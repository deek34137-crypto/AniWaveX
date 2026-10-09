import { NextRequest, NextResponse } from "next/server";
import { resolveKitsuSlugFromAnilist } from "@/lib/kitsu-mapper";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function generateSlug(title: string): string {
  if (!title) return "anime";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = (formData.get("image") || formData.get("file")) as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided for screenshot search." }, { status: 400 });
    }

    // Forward image to trace.moe
    const traceBody = new FormData();
    traceBody.append("image", imageFile);

    const traceRes = await fetch("https://api.trace.moe/search?anilistInfo", {
      method: "POST",
      body: traceBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!traceRes.ok) {
      if (traceRes.status === 429) {
        return NextResponse.json(
          { error: "Search rate limit exceeded. Please wait a few seconds and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Screenshot search failed with status ${traceRes.status}` },
        { status: traceRes.status }
      );
    }

    const traceData = await traceRes.json();
    const rawResults = Array.isArray(traceData.result) ? traceData.result : [];

    if (rawResults.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Deduplicate by AniList ID to keep the highest similarity frame per anime
    const bestMatches = new Map<number, any>();
    for (const r of rawResults) {
      const anilistId = typeof r.anilist === "object" ? r.anilist?.id : r.anilist;
      if (!anilistId || typeof anilistId !== "number") continue;

      const existing = bestMatches.get(anilistId);
      if (!existing || r.similarity > existing.similarity) {
        bestMatches.set(anilistId, r);
      }
    }

    const uniqueIds = Array.from(bestMatches.keys());
    if (uniqueIds.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Batch query AniList GraphQL for cover art, banner, and canonical titles
    const mediaMap = new Map<number, any>();
    try {
      const aniListQuery = `
        query ($ids: [Int]) {
          Page(perPage: 50) {
            media(id_in: $ids, type: ANIME) {
              id
              title {
                english
                romaji
                native
              }
              coverImage {
                extraLarge
                large
                medium
              }
              bannerImage
            }
          }
        }
      `;

      const gqlRes = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: aniListQuery, variables: { ids: uniqueIds } }),
        signal: AbortSignal.timeout(6000),
      });

      if (gqlRes.ok) {
        const gqlJson = await gqlRes.json();
        const list: any[] = gqlJson?.data?.Page?.media || [];
        for (const m of list) {
          mediaMap.set(m.id, m);
        }
      }
    } catch (err) {
      console.warn("[TraceMoe API] AniList batch fetch failed:", err);
    }

    // Resolve Kitsu Slugs and build custom AniWaveX internal play URLs
    const matches = await Promise.all(
      Array.from(bestMatches.entries()).map(async ([id, r]) => {
        const meta = mediaMap.get(id);
        const embeddedAnilist = typeof r.anilist === "object" ? r.anilist : null;

        const englishTitle = meta?.title?.english || embeddedAnilist?.title?.english;
        const romajiTitle = meta?.title?.romaji || embeddedAnilist?.title?.romaji;
        const nativeTitle = meta?.title?.native || embeddedAnilist?.title?.native;
        const finalTitle = englishTitle || romajiTitle || nativeTitle || r.filename || "Unknown Anime";

        const coverImage =
          meta?.coverImage?.extraLarge ||
          meta?.coverImage?.large ||
          meta?.coverImage?.medium ||
          r.image ||
          "";

        const episodeNum =
          typeof r.episode === "number"
            ? r.episode
            : parseInt(String(r.episode || "1"), 10) || 1;

        const fromSeconds = Math.max(0, Math.floor(r.from || 0));
        const toSeconds = Math.max(fromSeconds, Math.floor(r.to || fromSeconds));

        // Attempt deterministic resolution to AniWaveX's Kitsu slug
        let resolvedSlug = "";
        try {
          const kitsuMapping = await resolveKitsuSlugFromAnilist(id, {
            romaji: romajiTitle,
            english: englishTitle,
          });
          if (kitsuMapping?.slug) {
            resolvedSlug = kitsuMapping.slug;
          }
        } catch {}

        if (!resolvedSlug) {
          resolvedSlug = generateSlug(englishTitle || romajiTitle || finalTitle) || String(id);
        }

        // Custom internal link: points strictly to AniWaveX watch page with episode, autoplay, and seek timestamp
        const internalPlayUrl = `/anime/${encodeURIComponent(resolvedSlug)}?ep=${episodeNum}&play=1&t=${fromSeconds}`;

        return {
          anilistId: id,
          slug: resolvedSlug,
          title: finalTitle,
          romajiTitle: romajiTitle || undefined,
          nativeTitle: nativeTitle || undefined,
          coverImage,
          bannerImage: meta?.bannerImage || undefined,
          episode: episodeNum,
          fromSeconds,
          toSeconds,
          timestamp: formatTimestamp(r.from || 0),
          similarityPercent: Math.round((r.similarity || 0) * 100),
          previewVideo: r.video || undefined,
          previewImage: r.image || undefined,
          internalPlayUrl,
        };
      })
    );

    matches.sort((a, b) => b.similarityPercent - a.similarityPercent);

    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error("Screenshot search API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process image search." },
      { status: 500 }
    );
  }
}
