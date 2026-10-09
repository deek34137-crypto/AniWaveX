/**
 * Screenshot Search Client
 * - Uploads video frames / anime screenshots
 * - Resolves matching episode and timestamp
 * - Generates custom internal AniWaveX links directly to the scene on our site
 */

export interface TraceMoeResult {
  anilist: number | { id: number; title?: any };
  filename: string;
  episode: number | string | null;
  from: number; // in seconds
  to: number;   // in seconds
  similarity: number; // 0.0 - 1.0 (e.g. 0.94)
  video?: string;
  image?: string;
}

export interface TraceMoeAnimeMatch {
  anilistId: number;
  slug: string;
  title: string;
  romajiTitle?: string;
  nativeTitle?: string;
  coverImage: string;
  bannerImage?: string;
  episode: number | string | null;
  fromSeconds: number;
  toSeconds: number;
  timestamp: string; // e.g. "12:45"
  similarityPercent: number; // e.g. 96
  previewVideo?: string;
  previewImage?: string;
  internalPlayUrl: string;
}

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

/**
 * Searches Anime by screenshot image.
 * Uses internal /api/search/image route for server-side Kitsu mapping, with client-side fallback.
 */
export async function searchAnimeByImage(file: File): Promise<TraceMoeAnimeMatch[]> {
  const formData = new FormData();
  formData.append("image", file);

  // 1. Try internal API route (handles Kitsu slug resolution & server deduplication)
  try {
    const res = await fetch("/api/search/image", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.matches)) {
        return data.matches;
      }
    } else {
      const errJson = await res.json().catch(() => null);
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes("rate limit")) {
      throw err;
    }
    console.warn("[TraceMoe Client] Internal route failed, falling back to direct provider:", err?.message);
  }

  // 2. Direct client-side engine fallback
  const directForm = new FormData();
  directForm.append("image", file);

  const directRes = await fetch("https://api.trace.moe/search?anilistInfo", {
    method: "POST",
    body: directForm,
  });

  if (!directRes.ok) {
    if (directRes.status === 429) {
      throw new Error("Screenshot search rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(`Screenshot search failed with status ${directRes.status}`);
  }

  const data = await directRes.json();
  const rawResults: TraceMoeResult[] = data.result || [];

  if (!rawResults.length) {
    return [];
  }

  // Deduplicate by AniList ID to keep the highest similarity match for each anime
  const bestMatches = new Map<number, TraceMoeResult>();
  for (const r of rawResults) {
    const anilistId = typeof r.anilist === "object" ? (r.anilist as any)?.id : r.anilist;
    if (!anilistId || typeof anilistId !== "number") continue;

    const existing = bestMatches.get(anilistId);
    if (!existing || r.similarity > existing.similarity) {
      bestMatches.set(anilistId, r);
    }
  }

  const uniqueIds = Array.from(bestMatches.keys());
  if (uniqueIds.length === 0) return [];

  // Query AniList GraphQL in batch for title, cover, and banner
  const query = `
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

  const mediaMap = new Map<number, any>();
  try {
    const gqlRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { ids: uniqueIds } }),
    });
    if (gqlRes.ok) {
      const gqlJson = await gqlRes.json();
      const mediaList: any[] = gqlJson?.data?.Page?.media || [];
      for (const m of mediaList) {
        mediaMap.set(m.id, m);
      }
    }
  } catch (err) {
    console.warn("[TraceMoe Client] AniList batch fetch failed:", err);
  }

  // Build finalized matches with custom internal AniWaveX play links
  const matches: TraceMoeAnimeMatch[] = [];
  for (const [id, r] of bestMatches.entries()) {
    const meta = mediaMap.get(id);
    const title = meta?.title?.english || meta?.title?.romaji || meta?.title?.native || r.filename || "Unknown Anime";
    const cover = meta?.coverImage?.extraLarge || meta?.coverImage?.large || meta?.coverImage?.medium || r.image || "";

    const episodeNum = typeof r.episode === "number" ? r.episode : parseInt(String(r.episode || "1"), 10) || 1;
    const fromSeconds = Math.max(0, Math.floor(r.from || 0));
    const toSeconds = Math.max(fromSeconds, Math.floor(r.to || fromSeconds));

    // Custom internal link: leads to this anime episode and exact timestamp on our website
    const slug = generateSlug(title) || String(id);
    const internalPlayUrl = `/anime/${encodeURIComponent(slug)}?ep=${episodeNum}&play=1&t=${fromSeconds}`;

    matches.push({
      anilistId: id,
      slug,
      title,
      romajiTitle: meta?.title?.romaji,
      nativeTitle: meta?.title?.native,
      coverImage: cover,
      bannerImage: meta?.bannerImage,
      episode: episodeNum,
      fromSeconds,
      toSeconds,
      timestamp: formatTimestamp(r.from || 0),
      similarityPercent: Math.round(r.similarity * 100),
      previewVideo: r.video,
      previewImage: r.image,
      internalPlayUrl,
    });
  }

  return matches.sort((a, b) => b.similarityPercent - a.similarityPercent);
}
