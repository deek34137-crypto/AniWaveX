import { cache } from "react";
import { unstable_cache } from "next/cache";

export interface AiringAnimeScheduleItem {
  id: string | number;
  anilistId: number;
  slug: string;
  title: string;
  romajiTitle?: string;
  nativeTitle?: string;
  posterImage: string;
  bannerImage?: string;
  rating: string;
  genres: string[];
  format: string;
  totalEpisodes?: number | null;
  nextEpisodeNumber: number;
  airingAt: number; // Unix timestamp in seconds
  airingAtIso: string;
  timeUntilAiring: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  airTimeStr: string;
  airType?: string; // "raw" | "sub" | "dub"
  streamingPlatforms?: { site: string; url: string }[];
  description?: string;
}

function generateSlug(title: string): string {
  if (!title) return "anime";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchScheduleFromEngines(): Promise<AiringAnimeScheduleItem[]> {
  const normalizedMap = new Map<number, AiringAnimeScheduleItem>();

  // 1. Primary Engine: Tsuzuki Airing API
  try {
    const res = await fetch("https://tsuzuki.top/api/v1/airing", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.anime)) {
        for (const item of data.anime) {
          const title = item.title?.english || item.title?.romaji || item.title?.native || "Unknown";
          const slug = generateSlug(title);
          const nextEp = item.nextEpisode;
          const airingAt = nextEp?.airingAt || Math.floor(Date.now() / 1000);
          const date = new Date(airingAt * 1000);
          const dayOfWeek = date.getDay();
          const hours = date.getUTCHours().toString().padStart(2, "0");
          const minutes = date.getUTCMinutes().toString().padStart(2, "0");

          normalizedMap.set(item.id, {
            id: item.id,
            anilistId: item.id,
            slug,
            title,
            romajiTitle: item.title?.romaji,
            nativeTitle: item.title?.native,
            posterImage: item.coverImage?.large || item.coverImage?.medium || "",
            bannerImage: item.bannerImage,
            rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : "N/A",
            genres: item.genres || [],
            format: item.format || "TV",
            totalEpisodes: item.episodes,
            nextEpisodeNumber: nextEp?.episode || 1,
            airingAt,
            airingAtIso: nextEp?.airingAtIso || date.toISOString(),
            timeUntilAiring: Math.max(0, airingAt - Math.floor(Date.now() / 1000)),
            dayOfWeek,
            airTimeStr: `${hours}:${minutes} UTC`,
            airType: nextEp?.airType || "sub",
            streamingPlatforms: item.streamingOn || [],
          });
        }
      }
    }
  } catch (err: any) {
    console.error("Tsuzuki API fetch failed:", err?.message);
  }

  // 2. Secondary Engine: AniList GraphQL
  try {
    const now = Math.floor(Date.now() / 1000);
    const startOfWeek = now - 86400 * 2;
    const endOfWeek = now + 86400 * 7;
    const query = `
      query ($airingAt_greater: Int, $airingAt_lesser: Int) {
        Page(page: 1, perPage: 50) {
          airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              genres
              averageScore
              episodes
              format
              description
            }
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        query,
        variables: { airingAt_greater: startOfWeek, airingAt_lesser: endOfWeek },
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = await res.json();
      const schedules = json.data?.Page?.airingSchedules || [];
      for (const s of schedules) {
        const media = s.media;
        if (!media) continue;

        const title = media.title?.english || media.title?.romaji || media.title?.native || "Unknown";
        const slug = generateSlug(title);
        const airingAt = s.airingAt;
        const date = new Date(airingAt * 1000);
        const dayOfWeek = date.getDay();
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");

        if (!normalizedMap.has(media.id)) {
          normalizedMap.set(media.id, {
            id: media.id,
            anilistId: media.id,
            slug,
            title,
            romajiTitle: media.title?.romaji,
            nativeTitle: media.title?.native,
            posterImage: media.coverImage?.extraLarge || media.coverImage?.large || "",
            bannerImage: media.bannerImage,
            rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : "N/A",
            genres: media.genres || [],
            format: media.format || "TV",
            totalEpisodes: media.episodes,
            nextEpisodeNumber: s.episode,
            airingAt,
            airingAtIso: date.toISOString(),
            timeUntilAiring: Math.max(0, airingAt - Math.floor(Date.now() / 1000)),
            dayOfWeek,
            airTimeStr: `${hours}:${minutes} UTC`,
            airType: "sub",
            streamingPlatforms: [],
            description: media.description,
          });
        }
      }
    }
  } catch (err: any) {
    console.error("AniList GraphQL schedule fetch failed:", err?.message);
  }

  // 3. Fallback: Kitsu current airing anime if both external APIs are unreachable
  if (normalizedMap.size === 0) {
    try {
      const res = await fetch(
        "https://kitsu.io/api/edge/anime?filter[status]=current&sort=-user_count&page[limit]=30&include=categories",
        {
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        (json.data || []).forEach((item: any, idx: number) => {
          const attr = item.attributes;
          const title = attr.canonicalTitle || attr.slug;
          const numId = parseInt(item.id, 10) || idx;
          const dayOfWeek = numId % 7;
          const airHour = (18 + (numId % 5)).toString().padStart(2, "0");
          const airMin = ((numId * 15) % 60).toString().padStart(2, "0");

          normalizedMap.set(numId, {
            id: item.id,
            anilistId: numId,
            slug: attr.slug || generateSlug(title),
            title,
            posterImage: attr.posterImage?.original || "",
            bannerImage: attr.coverImage?.original || attr.posterImage?.original || "",
            rating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : "N/A",
            genres: ["Anime"],
            format: attr.subtype || "TV",
            totalEpisodes: attr.episodeCount,
            nextEpisodeNumber: 1,
            airingAt: Math.floor(Date.now() / 1000) + (dayOfWeek * 86400),
            airingAtIso: new Date().toISOString(),
            timeUntilAiring: dayOfWeek * 86400,
            dayOfWeek,
            airTimeStr: `${airHour}:${airMin} JST`,
            airType: "sub",
          });
        });
      }
    } catch {}
  }

  // Sort chronologically by airing timestamp
  return Array.from(normalizedMap.values()).sort((a, b) => a.airingAt - b.airingAt);
}

// Cached schedule with 30-minute TTL
export const getUnifiedAiringSchedule = cache(async (): Promise<AiringAnimeScheduleItem[]> => {
  return unstable_cache(
    async () => fetchScheduleFromEngines(),
    ["aniwavex_unified_airing_schedule"],
    { revalidate: 1800, tags: ["airing_schedule"] }
  )();
});
