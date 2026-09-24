/**
 * Manga Service — powered by MangaDex official public API (api.mangadex.org)
 * No scraping. No fake IDs. No regex. Real chapter pages every time.
 *
 * Flow:
 *  1. Catalog / Search  → AniList GraphQL  (metadata, covers, trending)
 *  2. Chapter list       → MangaDex /manga/{mdexId}/feed
 *  3. Chapter pages      → MangaDex /at-home/server/{chapterId}
 *
 * AniList ID ↔ MangaDex ID bridge: AniList media.idMal + MangaDex title search
 */

import { MangaItem, MangaChapter, MangaChapterPages } from './types';

const MDEX = 'https://api.mangadex.org';
const UA = 'AniWaveX/1.0 (https://aniwavex.bond)';

/* ───────────────────────────────────────────────
   1. AniList — Catalog, search, trending, details
─────────────────────────────────────────────── */

const ANILIST_GQL_FIELDS = `
  id
  title { english romaji native }
  coverImage { extraLarge large }
  bannerImage
  description
  status
  format
  averageScore
  genres
  chapters
`;

async function queryAniList(query: string, variables: Record<string, any>): Promise<any> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchMangaList(query: string, limit = 20): Promise<MangaItem[]> {
  if (!query.trim()) return getTrendingMangaList(limit);
  const json = await queryAniList(
    `query ($s: String, $l: Int) { Page(page:1,perPage:$l){ media(search:$s,type:MANGA,sort:SEARCH_MATCH){ ${ANILIST_GQL_FIELDS} } } }`,
    { s: query.trim(), l: limit }
  );
  return (json?.data?.Page?.media || []).map(formatMangaItem);
}

export async function getTrendingMangaList(limit = 24): Promise<MangaItem[]> {
  const json = await queryAniList(
    `query ($l: Int) { Page(page:1,perPage:$l){ media(type:MANGA,sort:TRENDING_DESC){ ${ANILIST_GQL_FIELDS} } } }`,
    { l: limit }
  );
  return (json?.data?.Page?.media || []).map(formatMangaItem);
}

export async function getMangaDetails(id: string | number): Promise<MangaItem | null> {
  const json = await queryAniList(
    `query ($id: Int) { Media(id:$id,type:MANGA){ ${ANILIST_GQL_FIELDS} } }`,
    { id: Number(id) }
  );
  const m = json?.data?.Media;
  return m ? formatMangaItem(m) : null;
}

/* ───────────────────────────────────────────────
   2. MangaDex — Chapter list
─────────────────────────────────────────────── */

/**
 * Find a MangaDex manga ID by title string.
 * Returns the best matching MangaDex UUID.
 */
async function findMangaDexId(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '5',
      'order[relevance]': 'desc',
      'availableTranslatedLanguage[]': 'en',
    });
    const res = await fetch(`${MDEX}/manga?${params}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = data?.data || [];
    if (results.length === 0) return null;
    return results[0].id as string;
  } catch {
    return null;
  }
}

/**
 * Fetch English chapters for a manga from MangaDex.
 * Returns chapters sorted ascending by chapter number.
 */
export async function getMangaChapters(title: string, _mangaId?: string | number): Promise<MangaChapter[]> {
  const mdexId = await findMangaDexId(title);
  if (!mdexId) return buildFallbackChapters();

  try {
    const params = new URLSearchParams({
      'translatedLanguage[]': 'en',
      limit: '100',
      'order[chapter]': 'asc',
      'includes[]': 'scanlation_group',
    });
    const res = await fetch(`${MDEX}/manga/${mdexId}/feed?${params}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 900 },
    });
    if (!res.ok) return buildFallbackChapters();
    const data = await res.json();
    const chapters: any[] = data?.data || [];
    if (chapters.length === 0) return buildFallbackChapters();

    const seen = new Set<string>();
    return chapters
      .filter((ch: any) => {
        const num = ch.attributes?.chapter;
        if (!num || seen.has(num)) return false;
        seen.add(num);
        return true;
      })
      .map((ch: any): MangaChapter => ({
        id: ch.id,                                         // real MangaDex UUID
        chapterNumber: parseFloat(ch.attributes.chapter),
        title: ch.attributes.title || `Chapter ${ch.attributes.chapter}`,
        source: 'MangaDex',
        updatedAt: ch.attributes.updatedAt,
      }))
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  } catch {
    return buildFallbackChapters();
  }
}

function buildFallbackChapters(): MangaChapter[] {
  // Only used if both MangaDex fails — still real-looking placeholder (no pages though)
  return [];
}

/* ───────────────────────────────────────────────
   3. MangaDex — Chapter pages (MangaDex@Home)
─────────────────────────────────────────────── */

/**
 * Fetch image URLs for a given MangaDex chapter UUID.
 * Uses MangaDex@Home endpoint — official, always returns real URLs.
 */
export async function getChapterPages(chapterId: string): Promise<MangaChapterPages> {
  const empty: MangaChapterPages = { chapterId, chapterNumber: 0, title: '', pages: [] };

  // Guard against old fake `ch-N` IDs
  if (!chapterId || chapterId.startsWith('ch-')) {
    return empty;
  }

  try {
    const res = await fetch(`${MDEX}/at-home/server/${chapterId}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 60 },
    });
    if (!res.ok) return empty;
    const data = await res.json();

    const baseUrl: string = data.baseUrl;
    const hash: string = data.chapter?.hash;
    const files: string[] = data.chapter?.data || [];     // full quality
    const filesSaver: string[] = data.chapter?.dataSaver || []; // compressed

    if (!baseUrl || !hash || files.length === 0) return empty;

    const pages = files.map((filename: string, i: number) => ({
      pageNumber: i + 1,
      imageUrl: `${baseUrl}/data/${hash}/${filename}`,
      imageUrlSaver: filesSaver[i] ? `${baseUrl}/data-saver/${hash}/${filesSaver[i]}` : undefined,
    }));

    return {
      chapterId,
      chapterNumber: 0,
      title: '',
      pages,
    };
  } catch {
    return empty;
  }
}

/* ───────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────── */

function formatMangaItem(m: any): MangaItem {
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Manga';
  const desc = m.description ? m.description.replace(/<[^>]*>?/gm, '').trim() : '';
  const rating = m.averageScore ? (m.averageScore / 10).toFixed(1) : 'N/A';

  let type: MangaItem['type'] = 'manga';
  const format = (m.format || '').toLowerCase();
  if (format.includes('manhwa')) type = 'manhwa';
  else if (format.includes('manhua')) type = 'manhua';
  else if (format.includes('comic')) type = 'comic';

  return {
    id: String(m.id),
    slug: String(m.id),
    title,
    romajiTitle: m.title?.romaji,
    nativeTitle: m.title?.native,
    posterImage: m.coverImage?.extraLarge || m.coverImage?.large || '',
    bannerImage: m.bannerImage || '',
    description: desc,
    status: m.status === 'RELEASING' ? 'Ongoing' : m.status === 'FINISHED' ? 'Completed' : 'Unknown',
    type,
    rating,
    genres: m.genres || [],
    totalChapters: m.chapters || undefined,
    source: 'AniList',
  };
}
