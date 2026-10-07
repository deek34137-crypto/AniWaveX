/**
 * Title & Episode Matching Utilities
 */

export function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function significantWords(s) {
  if (!s || typeof s !== 'string') return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

const TYPE_INDICATOR_WORDS = new Set([
  'ova', 'ona', 'special', 'specials', 'movie', 'film', 'recap', 'picture', 'pv',
  'season', 'part', 'cour', 'saga',
]);

export function scoreTitle(query, candidateTitle) {
  const needle = normalizeTitle(query);
  const hay = normalizeTitle(candidateTitle);
  if (!needle || !hay) return 0;
  if (hay === needle) return 100;

  const ratio = Math.min(needle.length, hay.length) / Math.max(needle.length, hay.length);
  const queryIsLonger = needle.length > hay.length;

  const queryWords = new Set(significantWords(query));
  const candidateWords = significantWords(candidateTitle);
  const hasSeason1 = /\bseason\s*0?1\b|\b1st\s*season\b/i.test(candidateTitle);
  const candidateAddsSpinoff = !queryIsLonger && candidateWords.some((w) => TYPE_INDICATOR_WORDS.has(w) && !queryWords.has(w) && !(hasSeason1 && w === 'season'));

  if (candidateAddsSpinoff) {
    return Math.floor(ratio * 40);
  }

  if (hay.startsWith(needle) || needle.startsWith(hay)) return Math.floor(ratio * 90);
  if (hay.includes(needle) || needle.includes(hay)) return Math.floor(ratio * 75);

  let matches = 0;
  for (const ch of needle) {
    if (hay.includes(ch)) matches++;
  }
  return Math.floor((matches / Math.max(needle.length, 1)) * 40);
}

export function getTitleVariations(rawTitle) {
  if (!rawTitle) return [];
  const cleaned = rawTitle
    .replace(/\(TV\)/gi, '')
    .replace(/\(Dub\)/gi, '')
    .replace(/\(Sub\)/gi, '')
    .replace(/\[Dub\]/gi, '')
    .replace(/\[Sub\]/gi, '')
    .replace(/Season\s+\d+/gi, '')
    .replace(/2nd\s+Season/gi, '')
    .replace(/3rd\s+Season/gi, '')
    .replace(/Part\s+\d+/gi, '')
    .replace(/:\s*Season\s*\d+/gi, '')
    .replace(/[’']s\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const variations = [rawTitle.trim()];
  if (cleaned && cleaned.toLowerCase() !== rawTitle.trim().toLowerCase()) {
    variations.push(cleaned);
  }

  if (cleaned.includes(':')) {
    const beforeColon = cleaned.split(':')[0].trim();
    if (beforeColon.length >= 3 && !variations.some((v) => v.toLowerCase() === beforeColon.toLowerCase())) {
      variations.push(beforeColon);
    }
  }

  if (cleaned.includes('-')) {
    const beforeHyphen = cleaned.split('-')[0].trim();
    if (beforeHyphen.length >= 3 && !variations.some((v) => v.toLowerCase() === beforeHyphen.toLowerCase())) {
      variations.push(beforeHyphen);
    }
  }

  return Array.from(new Set(variations));
}

export function parseEpisodeNumber(epIdentifier) {
  if (typeof epIdentifier === 'number') return epIdentifier;
  if (!epIdentifier) return 1;

  const str = String(epIdentifier).trim();
  const match = str.match(/(?:ep|episode|e)[-_\s]*(\d+(?:\.\d+)?)/i) ||
                str.match(/(\d+)[xX](\d+)/) ||
                str.match(/(\d+(?:\.\d+)?)$/);

  if (match) {
    // If 1x12 format, match[2] is episode
    if (match[2]) return parseFloat(match[2]);
    return parseFloat(match[1]);
  }

  return parseInt(str.replace(/[^\d]/g, ''), 10) || 1;
}

/**
 * Fetch AniList metadata for an ID
 */
export async function getAnilistTitles(anilistId) {
  if (!anilistId || !/^\d+$/.test(String(anilistId))) return [];
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        title {
          english
          romaji
          userPreferred
        }
        synonyms
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { id: parseInt(anilistId, 10) } }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const media = data?.data?.Media;
    const titles = [
      media?.title?.english,
      media?.title?.romaji,
      media?.title?.userPreferred,
      ...(media?.synonyms || []),
    ].filter(Boolean);
    return [...new Set(titles)];
  } catch {
    return [];
  }
}
