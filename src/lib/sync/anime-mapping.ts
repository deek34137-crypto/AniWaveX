import { SupabaseClient } from '@supabase/supabase-js';
import { AnimeMapping } from '@/types/sync';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const KITSU_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
};

// In-memory LRU cache to avoid excessive DB reads
const mappingMemoryCache = new Map<string, { mapping: AnimeMapping | null; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Deterministically resolve external provider IDs (AniList, MyAnimeList) for an AniWaveX anime.
 */
export async function resolveAnimeMapping(
  supabase: SupabaseClient,
  animeSlug: string,
  hintKitsuId?: string | number,
  fallbackTitle?: string
): Promise<AnimeMapping | null> {
  if (!animeSlug) return null;

  // 1. Check in-memory cache
  const cached = mappingMemoryCache.get(animeSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.mapping;
  }

  try {
    // 2. Check Supabase anime_mappings table
    const { data: dbMapping } = await supabase
      .from('anime_mappings')
      .select('*')
      .eq('anime_slug', animeSlug)
      .maybeSingle();

    if (dbMapping && (dbMapping.anilist_id || dbMapping.mal_id)) {
      mappingMemoryCache.set(animeSlug, { mapping: dbMapping, expiresAt: Date.now() + CACHE_TTL_MS });
      return dbMapping;
    }

    // 3. Resolve Kitsu ID if not provided
    let kitsuId = hintKitsuId ? String(hintKitsuId) : dbMapping?.kitsu_id;
    let animeTitle = fallbackTitle || dbMapping?.title;
    let totalEpisodes = dbMapping?.total_episodes || null;

    if (!kitsuId) {
      try {
        const kitsuRes = await fetch(
          `https://kitsu.io/api/edge/anime?filter[slug]=${encodeURIComponent(animeSlug)}&fields[anime]=id,canonicalTitle,episodeCount`,
          { headers: KITSU_HEADERS, signal: AbortSignal.timeout(4000) }
        );
        if (kitsuRes.ok) {
          const kitsuJson = await kitsuRes.json();
          const first = kitsuJson?.data?.[0];
          if (first) {
            kitsuId = String(first.id);
            animeTitle = animeTitle || first.attributes?.canonicalTitle;
            totalEpisodes = totalEpisodes || first.attributes?.episodeCount;
          }
        }
      } catch (err) {
        console.warn(`[AnimeMapping] Kitsu lookup failed for slug: ${animeSlug}`, err);
      }
    }

    let anilistId: number | null = dbMapping?.anilist_id || null;
    let malId: number | null = dbMapping?.mal_id || null;

    // 4. Query AniZip & ARM for cross-reference mapping if Kitsu ID is available
    if (kitsuId) {
      // Try AniZip
      try {
        const aniZipRes = await fetch(
          `https://api.ani.zip/mappings?kitsu_id=${encodeURIComponent(kitsuId)}`,
          { headers: HEADERS, signal: AbortSignal.timeout(4000) }
        );
        if (aniZipRes.ok) {
          const aniZipJson = await aniZipRes.json();
          const mappings = aniZipJson?.mappings;
          if (mappings) {
            if (!anilistId && mappings.anilist_id) {
              anilistId = Number(mappings.anilist_id);
            }
            if (!malId && mappings.mal_id) {
              malId = Number(mappings.mal_id);
            }
          }
        }
      } catch (err) {
        console.warn(`[AnimeMapping] AniZip lookup failed for kitsuId: ${kitsuId}`, err);
      }

      // If either AniList or MAL is still missing, try ARM (Anime Relations Map)
      if (!anilistId || !malId) {
        try {
          const armRes = await fetch(
            `https://arm.haglund.dev/api/v2/ids?source=kitsu&id=${encodeURIComponent(kitsuId)}`,
            { headers: HEADERS, signal: AbortSignal.timeout(4000) }
          );
          if (armRes.ok) {
            const armJson = await armRes.json();
            if (!anilistId && armJson?.anilist) {
              anilistId = Number(armJson.anilist);
            }
            if (!malId && armJson?.myanimelist) {
              malId = Number(armJson.myanimelist);
            }
          }
        } catch (err) {
          console.warn(`[AnimeMapping] ARM lookup failed for kitsuId: ${kitsuId}`, err);
        }
      }
    }

    // 5. Fallback: If title exists but AniList or MAL still not found, search AniList GraphQL by title
    if (!anilistId && animeTitle) {
      try {
        const query = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
              idMal
              episodes
            }
          }
        `;
        const alRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables: { search: animeTitle } }),
          signal: AbortSignal.timeout(4000),
        });
        if (alRes.ok) {
          const alJson = await alRes.json();
          const media = alJson?.data?.Media;
          if (media?.id) {
            anilistId = media.id;
            if (!malId && media.idMal) {
              malId = media.idMal;
            }
            if (!totalEpisodes && media.episodes) {
              totalEpisodes = media.episodes;
            }
          }
        }
      } catch {}
    }

    const mapping: AnimeMapping = {
      anime_slug: animeSlug,
      kitsu_id: kitsuId || null,
      anilist_id: anilistId,
      mal_id: malId,
      title: animeTitle || animeSlug,
      total_episodes: totalEpisodes,
    };

    // 6. Upsert into Supabase for instant future lookups
    if (anilistId || malId || kitsuId) {
      await supabase.from('anime_mappings').upsert(
        {
          anime_slug: animeSlug,
          kitsu_id: kitsuId || null,
          anilist_id: anilistId,
          mal_id: malId,
          title: animeTitle || animeSlug,
          total_episodes: totalEpisodes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'anime_slug' }
      );
    }

    mappingMemoryCache.set(animeSlug, { mapping, expiresAt: Date.now() + CACHE_TTL_MS });
    return mapping;
  } catch (error) {
    console.error(`[AnimeMapping] Error resolving mapping for ${animeSlug}:`, error);
    return null;
  }
}
