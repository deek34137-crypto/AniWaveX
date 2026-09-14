/**
 * Franchise relationship detection and prequel/sequel management.
 * Handles auto-removal of completed prequels from Continue Watching when sequels start playing.
 */

export interface FranchiseAnimeRef {
  slug?: string;
  animeSlug?: string;
  title?: string;
  animeTitle?: string;
  last_episode_watched?: number;
  episodeId?: number;
  progress_seconds?: number | null;
  status?: string;
}

export function normalizeFranchiseString(str?: string): string {
  if (!str) return "";
  let s = str.toLowerCase().trim();
  // Normalize spelled out numbers
  s = s.replace(/\bone-hundred\b/g, "100")
       .replace(/\bone hundred\b/g, "100")
       .replace(/\bfirst\b/g, "1")
       .replace(/\bsecond\b/g, "2")
       .replace(/\bthird\b/g, "3")
       .replace(/\bfourth\b/g, "4")
       .replace(/\bfifth\b/g, "5");
  // Normalize Roman numerals at end or separated
  s = s.replace(/\bii\b/g, "2")
       .replace(/\biii\b/g, "3")
       .replace(/\biv\b/g, "4")
       .replace(/\bv\b/g, "5");
  // Normalize punctuation and symbols
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  return s;
}

export interface SeasonInfo {
  seasonNum: number;
  isExplicitSequel: boolean;
  baseTitle: string;
  baseSlug: string;
}

export function extractSeasonInfo(title?: string, slug?: string): SeasonInfo {
  const combined = `${title || ""} ${slug || ""}`.toLowerCase();

  // Look for season, part, cour or ordinal markers
  const match = combined.match(/\b(?:season|s|part|cour)\s*([0-9]+)\b/) ||
                combined.match(/\b([0-9]+)(?:nd|rd|th|st)\s*(?:season|cour|part)\b/) ||
                combined.match(/\b(?:season|part)-([0-9]+)\b/) ||
                combined.match(/-([0-9]+)(?:nd|rd|th|st)-(?:season|cour|part)\b/) ||
                combined.match(/\b(2nd|3rd|4th|5th)\b/);

  let seasonNum = 1;
  let isExplicitSequel = false;

  if (match) {
    const rawVal = match[1];
    if (rawVal === "2nd") seasonNum = 2;
    else if (rawVal === "3rd") seasonNum = 3;
    else if (rawVal === "4th") seasonNum = 4;
    else if (rawVal === "5th") seasonNum = 5;
    else seasonNum = parseInt(rawVal, 10) || 1;
    if (seasonNum > 1) isExplicitSequel = true;
  } else if (/\b(?:ii|2nd\s*season|season\s*2|part\s*2|second\s*season)\b/.test(combined)) {
    seasonNum = 2;
    isExplicitSequel = true;
  } else if (/\b(?:iii|3rd\s*season|season\s*3|part\s*3|third\s*season)\b/.test(combined)) {
    seasonNum = 3;
    isExplicitSequel = true;
  }

  const cleanSeasonMarkers = (str: string) => {
    return normalizeFranchiseString(str)
      .replace(/\b(?:season|part|cour)\s*[0-9]+\b/g, "")
      .replace(/\b[0-9]+(?:nd|rd|th|st)\s*(?:season|cour|part)\b/g, "")
      .replace(/\b(?:1st|2nd|3rd|4th|5th)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const baseTitle = cleanSeasonMarkers(title || "");
  const baseSlug = cleanSeasonMarkers(slug || "");

  return { seasonNum, isExplicitSequel, baseTitle, baseSlug };
}

/**
 * Checks if `candidate` is a prequel of `current`.
 */
export function isPrequelOf(
  candidate: FranchiseAnimeRef,
  current: FranchiseAnimeRef,
  knownPrequels: Array<{ slug?: string; title?: string }> = []
): boolean {
  if (!candidate || !current) return false;
  const candSlug = candidate.animeSlug || candidate.slug || "";
  const currSlug = current.animeSlug || current.slug || "";
  const candTitle = candidate.animeTitle || candidate.title || "";
  const currTitle = current.animeTitle || current.title || "";

  if (candSlug && currSlug && candSlug === currSlug) return false;

  // 1. Check official/known prequels list (from Kitsu / AniList API)
  if (knownPrequels.length > 0) {
    if (
      knownPrequels.some((p) => {
        const pSlug = p.slug;
        const pTitle = p.title;
        return (
          (pSlug && (pSlug === candSlug || candSlug.includes(pSlug))) ||
          (pTitle && normalizeFranchiseString(pTitle) === normalizeFranchiseString(candTitle))
        );
      })
    ) {
      return true;
    }
  }

  const currInfo = extractSeasonInfo(currTitle, currSlug);
  const candInfo = extractSeasonInfo(candTitle, candSlug);

  // Current must be a higher season number or explicit sequel of candidate
  if (currInfo.seasonNum <= candInfo.seasonNum) {
    return false;
  }

  // 2. Base title match
  if (currInfo.baseTitle && candInfo.baseTitle) {
    if (currInfo.baseTitle === candInfo.baseTitle) return true;
    if (
      currInfo.baseTitle.startsWith(candInfo.baseTitle) ||
      candInfo.baseTitle.startsWith(currInfo.baseTitle)
    ) {
      return true;
    }
  }

  // 3. Base slug match
  if (currInfo.baseSlug && candInfo.baseSlug) {
    if (currInfo.baseSlug === candInfo.baseSlug) return true;
    if (
      currInfo.baseSlug.startsWith(candInfo.baseSlug) ||
      candInfo.baseSlug.startsWith(currInfo.baseSlug)
    ) {
      return true;
    }
  }

  // 4. Token overlap fallback (>= 70% word match on base title)
  if (currInfo.baseTitle && candInfo.baseTitle) {
    const candWords = new Set(candInfo.baseTitle.split(" ").filter((w) => w.length > 2));
    const currWords = new Set(currInfo.baseTitle.split(" ").filter((w) => w.length > 2));
    if (candWords.size > 0 && currWords.size > 0) {
      let intersection = 0;
      candWords.forEach((w) => {
        if (currWords.has(w)) intersection++;
      });
      const similarity = intersection / Math.min(candWords.size, currWords.size);
      if (similarity >= 0.75) return true;
    }
  }

  return false;
}

/**
 * Filter Continue Watching list:
 * If an item is completed and has a sequel actively being watched in the list,
 * omit the completed prequel so only the active sequel appears.
 * If the user hasn't played the sequel, the completed prequel is kept in the list.
 */
export function filterActiveSequelPrequels<T extends FranchiseAnimeRef>(
  items: T[],
  completedSlugs: Set<string> = new Set()
): T[] {
  if (!items || items.length <= 1) return items;

  return items.filter((candidate) => {
    const candSlug = candidate.animeSlug || candidate.slug || "";
    const isCompleted =
      completedSlugs.has(candSlug) ||
      (candidate.last_episode_watched !== undefined && candidate.last_episode_watched >= 11) ||
      (candidate.episodeId !== undefined && candidate.episodeId >= 11) ||
      candidate.status === "completed";

    // If not completed, keep in Continue Watching!
    if (!isCompleted) return true;

    // Check if any other item in the list is an active sequel of candidate
    const hasSequelInList = items.some((other) => {
      if (other === candidate) return false;
      const otherSlug = other.animeSlug || other.slug || "";
      if (otherSlug === candSlug) return false;
      return isPrequelOf(candidate, other);
    });

    // If sequel is actively in continue watching, omit the completed prequel
    return !hasSequelInList;
  });
}

/**
 * Fetch official prequels from Kitsu relationship API
 */
export async function fetchKitsuPrequels(
  kitsuId: string | number
): Promise<Array<{ id: string; slug: string; title: string }>> {
  if (!kitsuId) return [];
  try {
    const res = await fetch(
      `https://kitsu.io/api/edge/anime/${kitsuId}/media-relationships?include=destination`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
        },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const destinations = new Map<string, any>();
    for (const inc of json.included || []) {
      if (inc.type === "anime") {
        destinations.set(inc.id, inc);
      }
    }

    const prequels: Array<{ id: string; slug: string; title: string }> = [];
    for (const rel of json.data || []) {
      if (rel.attributes?.role === "prequel") {
        const destId = rel.relationships?.destination?.data?.id;
        const dest = destinations.get(destId);
        if (dest) {
          prequels.push({
            id: dest.id,
            slug: dest.attributes?.slug || "",
            title: dest.attributes?.canonicalTitle || "",
          });
        }
      }
    }
    return prequels;
  } catch {
    return [];
  }
}

/**
 * Cleans up completed prequels when the user starts playing a sequel anime.
 * 1. Ensures the completed prequel is marked 'completed' in bookmarks & watchlist.
 * 2. Removes the completed prequel from 'aniwavex_recent_watches' and Supabase 'watch_history'.
 * 3. Dispatches update events so Continue Watching row updates seamlessly.
 */
export async function handleSequelPlaybackStarted({
  currentAnime,
  supabase,
  userId,
}: {
  currentAnime: {
    slug: string;
    title: string;
    animeId?: string | number;
    posterImage?: string;
  };
  supabase?: any;
  userId?: string;
}) {
  if (typeof window === "undefined" || !currentAnime?.slug) return;

  try {
    // 1. Fetch official Kitsu prequels if animeId exists
    let knownPrequels: Array<{ slug: string; title: string }> = [];
    if (currentAnime.animeId) {
      knownPrequels = await fetchKitsuPrequels(currentAnime.animeId);
    }

    // 2. Read local recent watches
    const rawRecent = localStorage.getItem("aniwavex_recent_watches");
    const recentList: any[] = rawRecent ? JSON.parse(rawRecent) : [];

    // 3. Read bookmarks from localStorage
    const rawWatchlist = localStorage.getItem("aniwavex_watchlist");
    const localWatchlist: any[] = rawWatchlist ? JSON.parse(rawWatchlist) : [];
    const completedSlugs = new Set<string>();
    localWatchlist.forEach((w) => {
      if (w.status === "completed" && w.anime_slug) {
        completedSlugs.add(w.anime_slug);
      }
    });

    // Also check Supabase bookmarks if logged in
    if (supabase && userId) {
      try {
        const { data: dbBookmarks } = await supabase
          .from("bookmarks")
          .select("anime_slug, status")
          .eq("user_id", userId)
          .eq("status", "completed");
        if (dbBookmarks) {
          dbBookmarks.forEach((b: any) => {
            if (b.anime_slug) completedSlugs.add(b.anime_slug);
          });
        }
      } catch {}
    }

    // 4. Identify any completed prequel in recent watches or DB watch_history
    const prequelsToRemove: any[] = [];

    // Check items in localStorage recent watches
    recentList.forEach((item) => {
      const slug = item.animeSlug || item.slug;
      if (!slug || slug === currentAnime.slug) return;

      const isPrequel = isPrequelOf(
        { animeSlug: slug, animeTitle: item.animeTitle || item.title },
        { animeSlug: currentAnime.slug, animeTitle: currentAnime.title },
        knownPrequels
      );

      if (isPrequel) {
        const isDone =
          completedSlugs.has(slug) ||
          (item.episodeId && item.episodeId >= 11) ||
          (item.last_episode_watched && item.last_episode_watched >= 11);

        if (isDone) {
          prequelsToRemove.push(item);
        }
      }
    });

    // Also check DB watch history if authenticated
    if (supabase && userId) {
      try {
        const { data: dbHistory } = await supabase
          .from("watch_history")
          .select("*")
          .eq("user_id", userId);

        if (dbHistory && dbHistory.length > 0) {
          dbHistory.forEach((dbItem: any) => {
            const slug = dbItem.anime_slug;
            if (!slug || slug === currentAnime.slug) return;
            if (prequelsToRemove.some((p) => (p.animeSlug || p.slug) === slug)) return;

            const isPrequel = isPrequelOf(
              { animeSlug: slug, animeTitle: dbItem.anime_title },
              { animeSlug: currentAnime.slug, animeTitle: currentAnime.title },
              knownPrequels
            );

            if (isPrequel) {
              const isDone =
                completedSlugs.has(slug) ||
                (dbItem.last_episode_watched && dbItem.last_episode_watched >= 11);

              if (isDone) {
                prequelsToRemove.push({
                  animeSlug: slug,
                  animeTitle: dbItem.anime_title,
                  posterImage: dbItem.poster_image,
                  last_episode_watched: dbItem.last_episode_watched,
                });
              }
            }
          });
        }
      } catch {}
    }

    if (prequelsToRemove.length === 0) return;

    // 5. Process each completed prequel:
    // a) Add to Watched Anime (bookmarks & local watchlist as 'completed')
    // b) Remove from Continue Watching (localStorage & Supabase watch_history)
    for (const prequel of prequelsToRemove) {
      const pSlug = prequel.animeSlug || prequel.slug;
      const pTitle = prequel.animeTitle || prequel.title || pSlug;
      const pPoster = prequel.posterImage || prequel.poster_image || "";
      const pEp = prequel.last_episode_watched || prequel.episodeId || 12;

      // Add/ensure completed status in local watchlist
      const existingIdx = localWatchlist.findIndex((w) => w.anime_slug === pSlug);
      if (existingIdx >= 0) {
        localWatchlist[existingIdx].status = "completed";
        localWatchlist[existingIdx].last_episode_watched = pEp;
      } else {
        localWatchlist.unshift({
          anime_slug: pSlug,
          anime_title: pTitle,
          poster_image: pPoster,
          status: "completed",
          last_episode_watched: pEp,
          created_at: new Date().toISOString(),
        });
      }

      // Add/ensure completed status in Supabase bookmarks
      if (supabase && userId) {
        await supabase.from("bookmarks").upsert(
          {
            user_id: userId,
            anime_slug: pSlug,
            anime_title: pTitle,
            poster_image: pPoster,
            status: "completed",
            last_episode_watched: pEp,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,anime_slug" }
        );

        // Delete from watch_history in Supabase
        await supabase
          .from("watch_history")
          .delete()
          .eq("user_id", userId)
          .eq("anime_slug", pSlug);
      }
    }

    localStorage.setItem("aniwavex_watchlist", JSON.stringify(localWatchlist));

    // Remove prequels from local recent watches
    const pSlugSet = new Set(prequelsToRemove.map((p) => p.animeSlug || p.slug));
    const updatedRecent = recentList.filter(
      (item) => !pSlugSet.has(item.animeSlug || item.slug)
    );
    localStorage.setItem("aniwavex_recent_watches", JSON.stringify(updatedRecent));

    // 6. Dispatch events so UI reacts immediately
    window.dispatchEvent(
      new CustomEvent("aniwavex_watch_updated", {
        detail: { animeSlug: currentAnime.slug },
      })
    );
    window.dispatchEvent(
      new CustomEvent("aniwavex_watchlist_updated", {
        detail: { animeSlug: currentAnime.slug },
      })
    );
  } catch (err) {
    console.error("Failed to clean completed prequels:", err);
  }
}
