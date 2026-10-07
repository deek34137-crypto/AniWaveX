/**
 * StreamRuby / RubyVidHub Extractor
 */
import { unpackPacked, extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractStreamRuby(embedUrl, baseReferer = 'https://rubyvidhub.com/') {
  try {
    const fixedUrl = embedUrl.includes('/e/') ? embedUrl.replace('/e/', '/') : embedUrl;
    const res = await fetch(fixedUrl, {
      headers: {
        'User-Agent': UA,
        Referer: baseReferer,
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const unpacked = unpackPacked(html);
    const searchTarget = unpacked || html;

    const m3u8 = extractM3u8FromText(searchTarget);
    if (!m3u8) return null;

    const subtitles = extractSubtitlesFromText(searchTarget);

    return {
      server: 'StreamRuby',
      m3u8,
      directUrl: m3u8,
      referer: fixedUrl,
      subtitles,
    };
  } catch {
    return null;
  }
}
