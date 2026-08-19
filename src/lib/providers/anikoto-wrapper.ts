import { AnikotoProvider } from './anikoto/provider.js';
import { searchAnilist } from './anikoto/core/anilist.js';

const anikoto = new AnikotoProvider();

export async function getAnilistId(title: string): Promise<number | null> {
  if (!title) return null;

  try {
    // 1. Direct title search
    let results = await searchAnilist(title);
    if (results && results.length > 0) return results[0].id;

    // 2. Cleaned title: replace hyphens, underscores, colons with spaces
    const cleaned = title.replace(/[-_:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.toLowerCase() !== title.toLowerCase()) {
      results = await searchAnilist(cleaned);
      if (results && results.length > 0) return results[0].id;
    }

    // 3. Significant word prefix (first 3 to 5 words for long titles like "Tomei na Yoru ni...")
    const words = cleaned.split(' ').filter(w => w.length > 1);
    if (words.length > 3) {
      const prefix3 = words.slice(0, 3).join(' ');
      results = await searchAnilist(prefix3);
      if (results && results.length > 0) return results[0].id;

      const prefix4 = words.slice(0, 4).join(' ');
      results = await searchAnilist(prefix4);
      if (results && results.length > 0) return results[0].id;

      const prefix5 = words.slice(0, 5).join(' ');
      results = await searchAnilist(prefix5);
      if (results && results.length > 0) return results[0].id;
    }

    // 4. Remove season / part numbers (e.g. "Season 2", "2nd Season", "Part 2", "Movie")
    const noSeason = cleaned
      .replace(/season \d+/i, '')
      .replace(/\d+(nd|rd|th|st) season/i, '')
      .replace(/part \d+/i, '')
      .replace(/\b(tv|movie|ova|ona|special)\b/i, '')
      .trim();

    if (noSeason.length > 2 && noSeason.toLowerCase() !== cleaned.toLowerCase()) {
      results = await searchAnilist(noSeason);
      if (results && results.length > 0) return results[0].id;
    }

    // 5. First 2 words fallback
    if (words.length >= 2) {
      const firstTwo = words.slice(0, 2).join(' ');
      results = await searchAnilist(firstTwo);
      if (results && results.length > 0) return results[0].id;
    }

    return null;
  } catch (error) {
    console.error("Error fetching Anilist ID:", error);
    return null;
  }
}

export async function getAnikotoStream(title: string, episode: number, audio: 'sub' | 'dub' = 'sub', resolvedAnilistId?: number | null) {
  try {
    const anilistId = resolvedAnilistId ?? await getAnilistId(title);
    if (!anilistId) {
      console.warn("Anikoto: No AniList ID found in results for", title);
      return null;
    }

    // Fetch the stream for the specified episode
    const streamInfo = await anikoto.getStreams(anilistId, episode, audio);
    return streamInfo;
  } catch (error) {
    console.error("Anikoto streaming error:", error);
    return null;
  }
}
