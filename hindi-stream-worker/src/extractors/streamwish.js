/**
 * StreamWish / FileLions / CdnWish Extractor
 */
import { unpackPacked, extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractStreamWish(embedUrl) {
  try {
    let targetUrl = embedUrl;
    if (targetUrl.includes('/f/')) {
      const videoId = targetUrl.substring(targetUrl.indexOf('/f/') + 3);
      targetUrl = `https://streamwish.com/${videoId}`;
    }

    const host = new URL(targetUrl).host;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': UA,
        Referer: `https://${host}/`,
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const unpacked = html.includes('eval(function(p,a,c') ? unpackPacked(html) : '';
    const searchTarget = unpacked || html;

    const m3u8 = extractM3u8FromText(searchTarget);
    if (!m3u8) return null;

    const subtitles = extractSubtitlesFromText(searchTarget);

    return {
      server: 'StreamWish',
      m3u8,
      directUrl: m3u8,
      referer: `https://${host}/`,
      subtitles,
    };
  } catch {
    return null;
  }
}
