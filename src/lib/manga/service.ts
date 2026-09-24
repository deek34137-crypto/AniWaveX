/**
 * Manga Service — powered by mangahub-backend (Cloudflare Worker)
 *
 * Backend at https://mangahub-backend.deek34137.workers.dev aggregates
 * 13 providers: WeebCentral, MangaDex, ComicK, AsuraScans, MangaKatana, etc.
 *
 * Flow:
 *  1. Catalog / Search / Details → AniList GraphQL (metadata, covers)
 *  2. Chapter list               → backend /api/search + /api/chapters (multi-provider with relevance scoring)
 *  3. Chapter pages              → backend /api/pages (with logo filtering & referer injection)
 */

import { MangaItem, MangaChapter, MangaChapterPages } from './types';

const BACKEND = 'https://mangahub-backend.deek34137.workers.dev';

// Primary working providers with verified page extraction (MangaKatana excluded due to logo fallbacks)
const CHAPTER_PROVIDERS = [
  'weebcentral',
  'mangadex',
  'asurascan',
  'flamecomics',
  'mangaread',
  'mgeko',
  'novelcool',
  'kaliscan',
];

/* ───────────────────────────────────────────────
   AniList — Catalog metadata (covers, trending, details)
─────────────────────────────────────────────── */

const GQL_FIELDS = `
  id title { english romaji native }
  coverImage { extraLarge large }
  bannerImage description status format
  averageScore genres chapters
`;

async function anilistQuery(query: string, variables: Record<string, any>): Promise<any> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function searchMangaList(query: string, limit = 20): Promise<MangaItem[]> {
  if (!query.trim()) return getTrendingMangaList(limit);
  const json = await anilistQuery(
    `query ($s:String,$l:Int){Page(page:1,perPage:$l){media(search:$s,type:MANGA,sort:SEARCH_MATCH){${GQL_FIELDS}}}}`,
    { s: query.trim(), l: limit }
  );
  return (json?.data?.Page?.media || []).map(formatMangaItem);
}

export async function getTrendingMangaList(limit = 24): Promise<MangaItem[]> {
  const json = await anilistQuery(
    `query ($l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC){${GQL_FIELDS}}}}`,
    { l: limit }
  );
  return (json?.data?.Page?.media || []).map(formatMangaItem);
}

export async function getMangaDetails(id: string | number): Promise<MangaItem | null> {
  const json = await anilistQuery(
    `query ($id:Int){Media(id:$id,type:MANGA){${GQL_FIELDS}}}`,
    { id: Number(id) }
  );
  const m = json?.data?.Media;
  return m ? formatMangaItem(m) : null;
}

/* ───────────────────────────────────────────────
   Backend — Search across all providers
─────────────────────────────────────────────── */

interface BackendSearchResult {
  id: string;
  title: string;
  url: string;
  coverImage?: string;
  provider: string;
  altTitles?: string[];
  score?: number;
}

function titleScore(query: string, candidate: string): number {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const c = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!q || !c) return 0;
  if (q === c) return 1.0;
  if (c.includes(q)) return q.length / c.length;
  if (q.includes(c)) return c.length / q.length;
  return 0;
}

async function backendSearch(query: string): Promise<BackendSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${BACKEND}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []) as BackendSearchResult[];
  } catch {
    return [];
  }
}

/* ───────────────────────────────────────────────
   Backend — Chapters (finds richest provider)
─────────────────────────────────────────────── */

interface BackendChapter {
  id: string;
  number: string;
  numberValue: number;
  title: string;
  url: string;
  language: string;
  provider: string;
}

function cleanChapterTitle(rawTitle: string, num: number | string): string {
  if (!rawTitle) return `Chapter ${num}`;
  const firstLine = rawTitle.split('\n')[0].replace(/\s+/g, ' ').trim();
  return firstLine || `Chapter ${num}`;
}

export async function getMangaChapters(
  title: string,
  _mangaId?: string | number,
  romajiTitle?: string
): Promise<MangaChapter[]> {
  // 1. Search with title
  let rawResults = await backendSearch(title);

  // 2. If romajiTitle is different, also search romaji
  if (romajiTitle && romajiTitle !== title) {
    const romajiResults = await backendSearch(romajiTitle);
    const seen = new Set(rawResults.map((r) => `${r.provider}:${r.id}`));
    for (const r of romajiResults) {
      const key = `${r.provider}:${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        rawResults.push(r);
      }
    }
  }

  if (rawResults.length === 0) return [];

  // 3. Relevance filtering: compute match score against title and romaji
  const scoredResults = rawResults
    .map((r) => {
      const scorePrimary = titleScore(title, r.title);
      const scoreRomaji = romajiTitle ? titleScore(romajiTitle, r.title) : 0;
      return { ...r, score: Math.max(scorePrimary, scoreRomaji) };
    })
    .filter((r) => r.score >= 0.35)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (scoredResults.length === 0) return [];

  let bestChapters: MangaChapter[] = [];

  // 4. Try providers in priority order
  for (const providerId of CHAPTER_PROVIDERS) {
    const matches = scoredResults.filter((r) => r.provider === providerId);
    for (const match of matches) {
      try {
        const res = await fetch(`${BACKEND}/api/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: match.provider,
            id: match.id,
            url: match.url,
          }),
          next: { revalidate: 900 },
        });

        if (!res.ok) continue;
        const data = await res.json();
        const rawChapters: BackendChapter[] = data?.chapters || [];
        if (rawChapters.length === 0) continue;

        const formatted = rawChapters
          .map((ch): MangaChapter => ({
            id: JSON.stringify({
              provider: match.provider,
              chapterId: ch.id,
              chapterUrl: ch.url,
            }),
            chapterNumber: ch.numberValue ?? parseFloat(ch.number) ?? 0,
            title: cleanChapterTitle(ch.title, ch.number ?? ch.numberValue),
            source: data.providerName || match.provider,
          }))
          .sort((a, b) => a.chapterNumber - b.chapterNumber);

        // If provider has significant chapters (>= 10), select immediately
        if (formatted.length >= 10) {
          return formatted;
        }

        if (formatted.length > bestChapters.length) {
          bestChapters = formatted;
        }
      } catch {
        continue;
      }
    }
  }

  return bestChapters;
}

/* ───────────────────────────────────────────────
   Backend — Chapter Pages
─────────────────────────────────────────────── */

interface BackendPage {
  index: number;
  url: string;
  headers?: Record<string, string>;
  provider: string;
}

export async function getChapterPages(chapterId: string): Promise<MangaChapterPages> {
  const empty: MangaChapterPages = { chapterId, chapterNumber: 0, title: '', pages: [] };

  if (!chapterId || chapterId.startsWith('ch-')) return empty;

  // chapterId is a JSON envelope: { provider, chapterId, chapterUrl }
  let envelope: { provider: string; chapterId: string; chapterUrl: string };
  try {
    envelope = JSON.parse(chapterId);
  } catch {
    envelope = {
      provider: 'mangadex',
      chapterId,
      chapterUrl: `https://mangadex.org/chapter/${chapterId}`,
    };
  }

  try {
    const res = await fetch(`${BACKEND}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: envelope.provider,
        chapterId: envelope.chapterId,
        chapterUrl: envelope.chapterUrl,
        id: envelope.chapterId,
        url: envelope.chapterUrl,
      }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return empty;
    const data = await res.json();
    const rawPages: BackendPage[] = data?.pages || [];

    // Filter out dummy site logos and broken placeholder images
    const pages = rawPages.filter((p) => {
      const u = (p.url || '').toLowerCase();
      return !u.includes('logo.png') && !u.includes('logo.jpg') && !u.includes('/static/img/logo');
    });

    if (pages.length === 0) return empty;

    return {
      chapterId,
      chapterNumber: 0,
      title: '',
      pages: pages.map((p) => ({
        pageNumber: p.index,
        imageUrl: p.url,
        referer: p.headers?.referer,
      })),
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
