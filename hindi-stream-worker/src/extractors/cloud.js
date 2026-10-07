/**
 * DesiDub Cloud Server Extractor (cloud.desidubanime.me)
 */
import { unpackPacked, extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractCloud(embedUrl) {
  try {
    let playUrl = embedUrl;

    // Follow /external/ redirect to /play/ if needed
    if (embedUrl.includes('/external/')) {
      const extRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': UA,
          Referer: 'https://www.desidubanime.me/',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (extRes.ok) {
        const extHtml = await extRes.text();
        const playMatch = extHtml.match(/src=['"](\/play\/[^'"]+)['"]/i) ||
                          extHtml.match(/src=['"](https?:\/\/cloud\.desidubanime\.me\/play\/[^'"]+)['"]/i) ||
                          extHtml.match(/"url"\s*:\s*"(\/play\/[^"]+)"/i) ||
                          extHtml.match(/href=['"](\/play\/[^'"]+)['"]/i);
        if (playMatch) {
          playUrl = playMatch[1].startsWith('http')
            ? playMatch[1]
            : `https://cloud.desidubanime.me${playMatch[1]}`;
        }
      }
    }

    const playRes = await fetch(playUrl, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://cloud.desidubanime.me/',
        Origin: 'https://cloud.desidubanime.me',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!playRes.ok) return null;
    const playHtml = await playRes.text();

    const unpacked = playHtml.includes('eval(function(p,a,c') ? unpackPacked(playHtml) : '';
    const text = unpacked || playHtml;

    const fileMatch = text.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i) ||
                      text.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i) ||
                      text.match(/source\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);

    const m3u8 = fileMatch ? fileMatch[1].replace(/\\\//g, '/') : extractM3u8FromText(text);
    if (!m3u8) return null;

    const subtitles = extractSubtitlesFromText(text);

    return {
      server: 'Cloud (Hindi HLS)',
      m3u8,
      directUrl: m3u8,
      referer: playUrl,
      subtitles,
    };
  } catch {
    return null;
  }
}
