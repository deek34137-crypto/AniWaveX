/**
 * AniList & MyAnimeList Watchlist & Progress Synchronization Service
 */

import { fetchAniListGraphQL } from "@/lib/schedule";
import { WatchlistStatus } from "@/lib/watchlist";

export interface AniListImportItem {
  anime_slug: string;
  anime_title: string;
  poster_image: string;
  status: WatchlistStatus;
  progress?: number;
  totalEpisodes?: number;
  score?: number;
}

function generateSlug(title: string): string {
  if (!title) return "anime";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ANILIST_STATUS_MAP: Record<string, WatchlistStatus> = {
  CURRENT: "watching",
  PLANNING: "plan_to_watch",
  COMPLETED: "completed",
  DROPPED: "dropped",
  PAUSED: "on_hold",
  REPEATING: "watching",
};

/**
 * Fetch a user's entire public anime watchlist from AniList by username
 */
export async function fetchUserAniListWatchlist(username: string): Promise<AniListImportItem[]> {
  const query = `
    query ($username: String) {
      MediaListCollection(userName: $username, type: ANIME) {
        lists {
          name
          status
          entries {
            id
            status
            progress
            score
            media {
              id
              idMal
              title {
                english
                romaji
                native
              }
              coverImage {
                extraLarge
                large
              }
              episodes
              format
              isAdult
            }
          }
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL<{ MediaListCollection?: { lists?: any[] } }>(
    query,
    { username: username.trim() },
    { ttlMs: 5 * 60 * 1000, retries: 2, timeoutMs: 8000 }
  );

  const lists = data?.MediaListCollection?.lists || [];
  const importedItems: AniListImportItem[] = [];
  const seenSlugs = new Set<string>();

  for (const list of lists) {
    for (const entry of list.entries || []) {
      const media = entry.media;
      if (!media || media.isAdult || media.format === "MUSIC") continue;

      const title = media.title?.english || media.title?.romaji || media.title?.native || "Anime";
      const slug = generateSlug(title);

      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const status: WatchlistStatus = ANILIST_STATUS_MAP[entry.status] || "watching";
      const posterImage = media.coverImage?.extraLarge || media.coverImage?.large || "";

      importedItems.push({
        anime_slug: slug,
        anime_title: title,
        poster_image: posterImage,
        status,
        progress: entry.progress || 0,
        totalEpisodes: media.episodes,
        score: entry.score || 0,
      });
    }
  }

  return importedItems;
}

/**
 * Update playback episode progress directly on AniList using OAuth token
 */
export async function syncProgressToAniList(
  token: string,
  mediaId: number,
  progress: number
): Promise<{ success: boolean; message?: string }> {
  if (!token || !mediaId) return { success: false, message: "Missing token or mediaId" };

  const mutation = `
    mutation ($mediaId: Int, $progress: Int) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
        id
        status
        progress
      }
    }
  `;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { mediaId, progress },
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, message: errJson?.errors?.[0]?.message || "AniList sync error" };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error" };
  }
}