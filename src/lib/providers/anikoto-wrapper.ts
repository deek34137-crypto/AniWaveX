import { AnikotoProvider } from './anikoto/provider.js';

const anikoto = new AnikotoProvider();

import { searchAnilist } from './anikoto/core/anilist.js';

export async function getAnilistId(title: string) {
  try {
    let results = await searchAnilist(title);
    
    // If no results, try a simplified title (e.g. remove subtitles after colons)
    if (!results || results.length === 0) {
      const simplifiedTitle = title.split(':')[0].trim();
      if (simplifiedTitle !== title) {
        results = await searchAnilist(simplifiedTitle);
      }
    }
    
    // If still no results, try removing season information or hyphens
    if (!results || results.length === 0) {
      const verySimple = title.replace(/season \d+/i, '').replace(/[-:]/g, ' ').trim();
      if (verySimple !== title) {
        results = await searchAnilist(verySimple);
      }
    }

    if (!results || results.length === 0) return null;
    
    const match = results[0];
    return match ? match.id : null;
  } catch (error) {
    console.error("Error fetching Anilist ID:", error);
    return null;
  }
}

export async function getAnikotoStream(title: string, episode: number, audio: 'sub' | 'dub' = 'sub') {
  try {
    const anilistId = await getAnilistId(title);
    if (!anilistId) {
      console.warn("Anikoto: No AniList ID found in results for", title);
      return null;
    }

    // 2. Fetch the stream for the specified episode
    const streamInfo = await anikoto.getStreams(anilistId, episode, audio);
    
    return streamInfo;
  } catch (error) {
    console.error("Anikoto streaming error:", error);
    return null;
  }
}
