/**
 * Trace.moe Screenshot Search API Client
 * - Uploads video frames / anime screenshots directly to https://api.trace.moe/search
 * - Deduplicates hits by AniList ID
 * - Enriches anime metadata using AniList GraphQL endpoint
 */

export interface TraceMoeResult {
  anilist: number;
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
  title: string;
  romajiTitle?: string;
  nativeTitle?: string;
  coverImage: string;
  bannerImage?: string;
  episode: number | string | null;
  timestamp: string; // e.g. "12:45"
  similarityPercent: number; // e.g. 96
  previewVideo?: string;
  previewImage?: string;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export async function searchAnimeByImage(file: File): Promise<TraceMoeAnimeMatch[]> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('https://api.trace.moe/search?anilistInfo', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Trace.moe search rate limit exceeded (10 requests/minute). Please wait a moment and try again.');
    }
    throw new Error(`Trace.moe image search failed with status ${res.status}`);
  }

  const data = await res.json();
  const rawResults: TraceMoeResult[] = data.result || [];

  if (!rawResults.length) {
    return [];
  }

  // Deduplicate by AniList ID to keep the highest similarity match for each anime
  const bestMatches = new Map<number, TraceMoeResult>();
  for (const r of rawResults) {
    if (!r.anilist) continue;
    const existing = bestMatches.get(r.anilist);
    if (!existing || r.similarity > existing.similarity) {
      bestMatches.set(r.anilist, r);
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

  let mediaMap = new Map<number, any>();
  try {
    const gqlRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
    console.warn('[TraceMoe] AniList batch fetch failed:', err);
  }

  // Build finalized matches sorted by similarity
  const matches: TraceMoeAnimeMatch[] = [];
  for (const [id, r] of bestMatches.entries()) {
    const meta = mediaMap.get(id);
    const title = meta?.title?.english || meta?.title?.romaji || meta?.title?.native || r.filename || 'Unknown Anime';
    const cover = meta?.coverImage?.extraLarge || meta?.coverImage?.large || meta?.coverImage?.medium || r.image || '';

    matches.push({
      anilistId: id,
      title,
      romajiTitle: meta?.title?.romaji,
      nativeTitle: meta?.title?.native,
      coverImage: cover,
      bannerImage: meta?.bannerImage,
      episode: r.episode,
      timestamp: formatTimestamp(r.from),
      similarityPercent: Math.round(r.similarity * 100),
      previewVideo: r.video,
      previewImage: r.image,
    });
  }

  return matches.sort((a, b) => b.similarityPercent - a.similarityPercent);
}
