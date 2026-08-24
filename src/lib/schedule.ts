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
  airType?: string;
  studio?: string;
  streamingPlatforms?: { site: string; url: string }[];
  description?: string;
  countryOfOrigin?: string;
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
  const now = Math.floor(Date.now() / 1000);
  const startOfWeek = now - 86400; // From yesterday to next 7 days
  const endOfWeek = now + 86400 * 7;

  // 1. Primary Engine: AniList GraphQL for Authentic Japanese Anime Schedules
  for (let page = 1; page <= 2; page++) {
    try {
      const query = `
        query ($page: Int, $perPage: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
          Page(page: $page, perPage: $perPage) {
            airingSchedules(
              airingAt_greater: $airingAt_greater
              airingAt_lesser: $airingAt_lesser
              sort: TIME
            ) {
              id
              airingAt
              timeUntilAiring
              episode
              media {
                id
                idMal
                countryOfOrigin
                isAdult
                popularity
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
                studios(isMain: true) {
                  nodes {
                    name
                  }
                }
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
          variables: {
            page,
            perPage: 50,
            airingAt_greater: startOfWeek,
            airingAt_lesser: endOfWeek,
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const json = await res.json();
        const schedules = json.data?.Page?.airingSchedules || [];

        for (const s of schedules) {
          const media = s.media;
          if (!media || media.isAdult || media.format === "MUSIC") continue;

          // Exclude Chinese 3D donghua (Tencent, iQIYI, WeTV) - Keep Japanese anime (JP) and popular Korean anime (KR)
          if (media.countryOfOrigin === "CN") continue;

          const title = media.title?.english || media.title?.romaji || media.title?.native || "Unknown";
          const slug = generateSlug(title);
          const airingAt = s.airingAt;
          const date = new Date(airingAt * 1000);
          const dayOfWeek = date.getDay();
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");

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
              timeUntilAiring: Math.max(0, airingAt - now),
              dayOfWeek,
              airTimeStr: `${hours}:${minutes}`,
              airType: "sub",
              studio: media.studios?.nodes?.[0]?.name,
              streamingPlatforms: [],
              description: media.description,
              countryOfOrigin: media.countryOfOrigin || "JP",
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`AniList page ${page} schedule fetch failed:`, err?.message);
    }
  }

  // 2. Complementary Engine: Tsuzuki Airing API for Western Simulcast & Streaming Services
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
          // Filter out Chinese donghua
          if (item.countryOfOrigin === "CN") continue;

          if (normalizedMap.has(item.id)) {
            const existing = normalizedMap.get(item.id)!;
            if (item.streamingOn && item.streamingOn.length > 0) {
              // Filter out Chinese platforms, keep Crunchyroll, Netflix, Hulu, YouTube, etc.
              const validPlatforms = item.streamingOn.filter(
                (st: any) => !["Tencent Video", "iQIYI", "WeTV", "Youku", "Bilibili"].includes(st.site)
              );
              if (validPlatforms.length > 0) {
                existing.streamingPlatforms = validPlatforms;
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Tsuzuki API streaming platform enrich failed:", err?.message);
  }

  // 3. Fallback to Kitsu current airing anime if both fail
  if (normalizedMap.size === 0) {
    try {
      const res = await fetch(
        "https://kitsu.io/api/edge/anime?filter[status]=current&sort=-user_count&page[limit]=40&include=categories",
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
            airingAt: Math.floor(Date.now() / 1000) + dayOfWeek * 86400,
            airingAtIso: new Date().toISOString(),
            timeUntilAiring: dayOfWeek * 86400,
            dayOfWeek,
            airTimeStr: `${airHour}:${airMin}`,
            airType: "sub",
            countryOfOrigin: "JP",
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
    ["aniwavex_pure_japanese_airing_schedule_v2"],
    { revalidate: 1800, tags: ["airing_schedule"] }
  )();
});
