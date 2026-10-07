/**
 * Turbovid Extractor
 */
import { extractM3u8FromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractTurbovid(embedUrl, baseReferer = 'https://toonstream.us/') {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': UA,
        Referer: baseReferer,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const m3u8 = extractM3u8FromText(html);
    if (!m3u8) return null;

    return {
      server: 'Turbovid',
      m3u8,
      directUrl: m3u8,
      referer: 'https://emturbovid.com/',
      subtitles: [],
    };
  } catch {
    return null;
  }
}
