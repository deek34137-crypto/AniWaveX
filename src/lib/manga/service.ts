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

const BACKEND =
  process.env.NEXT_PUBLIC_MANGA_WORKER_URL ||
  process.env.MANGA_API_URL ||
  'https://aniwavex-manga-worker.rajverma159310.workers.dev';

// Primary working providers with verified page extraction (MangaKatana excluded due to logo fallbacks)
const CHAPTER_PROVIDERS = [
  'weebcentral',
  'mangadex',
  'mangaread',
  'asurascan',
  'flamecomics',
  'novelcool',
  'kaliscan',
  'mgeko',
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
  const trimmed = query.trim();
  if (!trimmed) return getTrendingMangaList(limit);

  // 1. Direct AniList search
  const json = await anilistQuery(
    `query ($s:String,$l:Int){Page(page:1,perPage:$l){media(search:$s,type:MANGA,sort:SEARCH_MATCH){${GQL_FIELDS}}}}`,
    { s: trimmed, l: limit }
  );
  const directResults = (json?.data?.Page?.media || []).map(formatMangaItem);
  if (directResults.length > 0) {
    return directResults;
  }

  // 2. Fallback: AniList strict token search returned 0 (common for partial words/prefixes like "danda").
  // Use Kitsu's flexible substring/prefix search to resolve potential canonical manga titles.
  try {
    const kitsuRes = await fetch(
      `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(trimmed)}&page[limit]=4`,
      {
        headers: { Accept: 'application/vnd.api+json' },
        next: { revalidate: 3600 },
      }
    );
    if (kitsuRes.ok) {
      const kitsuData = await kitsuRes.json();
      const candidateTitles: string[] = [];
      const seenTitles = new Set<string>();

      for (const item of kitsuData?.data || []) {
        const titles = [
          item.attributes?.canonicalTitle,
          item.attributes?.titles?.en,
          item.attributes?.titles?.en_jp,
        ].filter(Boolean);

        for (const t of titles) {
          const lower = t.trim().toLowerCase();
          if (!seenTitles.has(lower)) {
            seenTitles.add(lower);
            candidateTitles.push(t.trim());
          }
        }
      }

      if (candidateTitles.length > 0) {
        // Query AniList using resolved titles in parallel
        const anilistLookups = await Promise.all(
          candidateTitles.slice(0, 3).map((title) =>
            anilistQuery(
              `query ($s:String,$l:Int){Page(page:1,perPage:$l){media(search:$s,type:MANGA,sort:SEARCH_MATCH){${GQL_FIELDS}}}}`,
              { s: title, l: Math.min(limit, 10) }
            )
          )
        );

        const seenIds = new Set<string>();
        const resolvedManga: MangaItem[] = [];

        for (const res of anilistLookups) {
          const media = res?.data?.Page?.media || [];
          for (const m of media) {
            const formatted = formatMangaItem(m);
            if (!seenIds.has(formatted.id)) {
              seenIds.add(formatted.id);
              resolvedManga.push(formatted);
            }
          }
        }

        if (resolvedManga.length > 0) {
          return resolvedManga.slice(0, limit);
        }
      }
    }
  } catch {
    // If fallback lookup fails, return empty
  }

  return [];
}


export async function getTrendingMangaList(limit = 24): Promise<MangaItem[]> {
  const json = await anilistQuery(
    `query ($l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC){${GQL_FIELDS}}}}`,
    { l: limit }
  );
  return (json?.data?.Page?.media || []).map(formatMangaItem);
}

export interface MangaFilterOptions {
  category?: string;
  search?: string;
  limit?: number;
}

export async function filterMangaList(options: MangaFilterOptions): Promise<MangaItem[]> {
  const { category = 'all', search, limit = 24 } = options;

  if (search && search.trim()) {
    return searchMangaList(search.trim(), limit);
  }

  const cat = category.toLowerCase().trim();

  if (cat === 'manhwa') {
    const json = await anilistQuery(
      `query ($l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC,countryOfOrigin:"KR"){${GQL_FIELDS}}}}`,
      { l: limit }
    );
    return (json?.data?.Page?.media || []).map(formatMangaItem);
  }

  if (cat === 'manhua') {
    const json = await anilistQuery(
      `query ($l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC,countryOfOrigin:"CN"){${GQL_FIELDS}}}}`,
      { l: limit }
    );
    return (json?.data?.Page?.media || []).map(formatMangaItem);
  }

  if (cat === 'isekai') {
    const json = await anilistQuery(
      `query ($l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC,tag:"Isekai"){${GQL_FIELDS}}}}`,
      { l: limit }
    );
    return (json?.data?.Page?.media || []).map(formatMangaItem);
  }

  const GENRES: Record<string, string> = {
    action: 'Action',
    romance: 'Romance',
    fantasy: 'Fantasy',
    adventure: 'Adventure',
    drama: 'Drama',
    comedy: 'Comedy',
    supernatural: 'Supernatural',
    mystery: 'Mystery',
    horror: 'Horror',
    scifi: 'Sci-Fi',
    sliceoflife: 'Slice of Life',
  };

  const genre = GENRES[cat];
  if (genre) {
    const json = await anilistQuery(
      `query ($g:String,$l:Int){Page(page:1,perPage:$l){media(type:MANGA,sort:TRENDING_DESC,genre:$g){${GQL_FIELDS}}}}`,
      { g: genre, l: limit }
    );
    return (json?.data?.Page?.media || []).map(formatMangaItem);
  }

  return getTrendingMangaList(limit);
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

async function searchWeebCentral(query: string): Promise<BackendSearchResult[]> {
  const targetUrl = `https://weebcentral.com/search/data?author=&text=${encodeURIComponent(
    query
  )}&sort=Best+Match&order=Ascending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`;

  const parseHtml = (html: string): BackendSearchResult[] => {
    const regex = /\/series\/([0-9A-Z]+)\/([^\"]+)/g;
    let match: RegExpExecArray | null;
    const results: BackendSearchResult[] = [];
    const seen = new Set<string>();
    while ((match = regex.exec(html)) !== null) {
      const id = match[1];
      const slug = match[2];
      if (!seen.has(id)) {
        seen.add(id);
        const title = slug.replace(/-/g, ' ');
        results.push({
          id,
          title,
          url: `https://weebcentral.com/series/${id}/${slug}`,
          provider: 'weebcentral',
        });
      }
    }
    return results;
  };

  // 1. Try direct fetch with short timeout
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://weebcentral.com/search',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const html = await res.text();
      const results = parseHtml(html);
      if (results.length > 0) return results;
    }
  } catch {
    // Direct search failed or timed out (e.g. Cloudflare challenge on datacenter IP)
  }

  // 2. Fallback to worker htmlProxy (Worker operates on Cloudflare edge and bypasses datacenter IP blocks)
  try {
    const proxyUrl = `${BACKEND}/api/proxy/html?provider=weebcentral&url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const html = await res.text();
      return parseHtml(html);
    }
  } catch {
    // Proxy fallback failed
  }

  return [];
}

async function backendSearch(query: string): Promise<BackendSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const [directWc, workerResults] = await Promise.all([
      searchWeebCentral(query),
      (async () => {
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
      })(),
    ]);

    const combined = [...directWc, ...workerResults];
    const seen = new Set<string>();
    const deduplicated: BackendSearchResult[] = [];
    for (const r of combined) {
      const key = `${r.provider}:${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(r);
      }
    }
    return deduplicated;
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

function isDateOrTimeAgo(str: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  // Relative patterns like "1 year", "1 year, 1 month", "2 months ago", "3 days", "yesterday", "today"
  const relativeDatePattern =
    /^(?:yesterday|today|just now|(?:an?|\d+)\s*(?:sec|second|min|minute|hour|hr|day|week|month|yr|year)s?(?:\s*,\s*(?:an?|\d+)\s*(?:sec|second|min|minute|hour|hr|day|week|month|yr|year)s?)*(?:\s*ago)?)$/i;
  // Standard date formats like "2024-05-12", "05/12/2024", "Jan 12, 2024", "12 Jan 2024"
  const standardDatePattern =
    /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*,?\s*\d{4})$/i;
  return relativeDatePattern.test(s) || standardDatePattern.test(s);
}

function extractChapterNumber(rawNum: any, rawTitle: string, rawUrl: string): number {
  // 1. Primary: Use rawNum / rawNumberValue directly if valid (API-provided chapter number)
  if (typeof rawNum === 'number' && !isNaN(rawNum) && rawNum >= 0) {
    return rawNum;
  }
  if (typeof rawNum === 'string') {
    const trimmed = rawNum.trim();
    // Exclude strings that look like UUIDs or hashes
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) {
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  // 2. Secondary: Try title extraction if title explicitly specifies a chapter number e.g. "Chapter 211" or "Ch. 5"
  if (rawTitle && !isDateOrTimeAgo(rawTitle)) {
    const titleMatch = rawTitle.match(/(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i);
    if (titleMatch) {
      const parsed = parseFloat(titleMatch[1]);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  // 3. Fallback: URL extraction — NEVER match UUIDs like /chapter/1f60069b-0c36-45c9-bd9d-41d51e90c552!
  if (rawUrl && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawUrl)) {
    const urlMatch = rawUrl.match(/(?:chapter|ch)[-_/](\d+(?:\.\d+)?)(?:[^\da-f]|$)/i);
    if (urlMatch) {
      const parsed = parseFloat(urlMatch[1]);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return 0;
}

function cleanChapterTitle(rawTitle: string, num: number | string): string {
  if (!rawTitle) return `Chapter ${num}`;
  const firstLine = rawTitle.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (!firstLine || isDateOrTimeAgo(firstLine)) {
    return `Chapter ${num}`;
  }

  // If title is just a raw number (e.g. "211" or "211.5"), format as "Chapter 211"
  if (/^\d+(?:\.\d+)?$/.test(firstLine)) {
    return `Chapter ${firstLine}`;
  }

  // If title doesn't mention chapter number and isn't a special chapter (Prologue, Extra, etc.),
  // format with chapter number: e.g. "Chapter 211: Who the Heck?"
  if (
    !/^(?:chapter|ch\.?|ep\.?|episode)\s*\d+/i.test(firstLine) &&
    !/^(?:prologue|epilogue|extra|oneshot|special)/i.test(firstLine)
  ) {
    return `Chapter ${num}: ${firstLine}`;
  }

  return firstLine;
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

  // 3. Search sanitized base title if it contains brackets, parentheses or subtitles
  const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  if (cleanTitle && cleanTitle !== title && cleanTitle !== romajiTitle) {
    const cleanResults = await backendSearch(cleanTitle);
    const seen = new Set(rawResults.map((r) => `${r.provider}:${r.id}`));
    for (const r of cleanResults) {
      const key = `${r.provider}:${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        rawResults.push(r);
      }
    }
  }

  if (rawResults.length === 0) return [];

  // 4. Relevance filtering: compute match score against title, romaji, and cleanTitle
  let scoredResults = rawResults
    .map((r) => {
      const scorePrimary = titleScore(title, r.title);
      const scoreRomaji = romajiTitle ? titleScore(romajiTitle, r.title) : 0;
      const scoreClean = cleanTitle ? titleScore(cleanTitle, r.title) : 0;
      return { ...r, score: Math.max(scorePrimary, scoreRomaji, scoreClean) };
    })
    .filter((r) => r.score >= 0.35)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (scoredResults.length === 0) return [];

  // If there are high-confidence exact/near-exact title matches (score >= 0.85),
  // prioritize them exclusively so spin-offs (e.g. "One Piece Party" with score 0.61) don't hijack the main series
  const highQualityMatches = scoredResults.filter((r) => (r.score || 0) >= 0.85);
  if (highQualityMatches.length > 0) {
    scoredResults = highQualityMatches;
  }

  let bestChapters: MangaChapter[] = [];
  let bestScore = 0;

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

        // If provider is mangadex, verify that it actually has hosted image pages (not external 0-page links)
        if (match.provider === 'mangadex') {
          const sample = rawChapters[0];
          try {
            const testRes = await fetch(`${BACKEND}/api/pages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'mangadex',
                chapterId: sample.id,
                chapterUrl: sample.url,
                id: sample.id,
                url: sample.url,
              }),
            });
            const testData = await testRes.json();
            if (!testData?.pages || testData.pages.length === 0) {
              // MangaDex has no pages (licensed external link like Kodansha/Viz), skip to next provider
              continue;
            }
          } catch {
            continue;
          }
        }

        const formatted = rawChapters
          .map((ch): MangaChapter => {
            const num = extractChapterNumber(ch.numberValue ?? ch.number, ch.title, ch.url);
            return {
              id: JSON.stringify({
                provider: match.provider,
                chapterId: ch.id,
                chapterUrl: ch.url,
              }),
              chapterNumber: num,
              title: cleanChapterTitle(ch.title, num || ch.number || ch.numberValue),
              source: data.providerName || match.provider,
            };
          })
          .sort((a, b) => a.chapterNumber - b.chapterNumber);

        // Deduplicate chapters by chapterNumber
        const seenNums = new Set<number>();
        const uniqueChapters: MangaChapter[] = [];
        for (const ch of formatted) {
          if (!seenNums.has(ch.chapterNumber)) {
            seenNums.add(ch.chapterNumber);
            uniqueChapters.push(ch);
          }
        }

        const startsNearBeginning = uniqueChapters.length > 0 && uniqueChapters[0].chapterNumber <= 1;

        // If high-quality title match with a comprehensive collection (>= 50 chapters) starting at the beginning, select immediately
        if ((match.score || 0) >= 0.85 && uniqueChapters.length >= 50 && startsNearBeginning) {
          return uniqueChapters;
        }

        // Compare against best candidate so far:
        if (bestChapters.length === 0) {
          bestChapters = uniqueChapters;
          bestScore = match.score || 0;
        } else {
          const bestStartsNearBeginning = bestChapters[0]?.chapterNumber <= 1;
          // Prefer higher title match score if significantly better (e.g. exact match over spin-off)
          if ((match.score || 0) > bestScore + 0.15) {
            bestChapters = uniqueChapters;
            bestScore = match.score || 0;
          } else if (startsNearBeginning && !bestStartsNearBeginning) {
            // A provider starting at Chapter 1 always takes precedence over one starting mid-way
            bestChapters = uniqueChapters;
            bestScore = match.score || 0;
          } else if (startsNearBeginning === bestStartsNearBeginning && uniqueChapters.length > bestChapters.length) {
            // More comprehensive collection (e.g. 1194 chapters vs 17)
            bestChapters = uniqueChapters;
            bestScore = match.score || 0;
          }
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
