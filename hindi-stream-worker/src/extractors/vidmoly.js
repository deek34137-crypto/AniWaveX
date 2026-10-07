/**
 * VidMoly Extractor
 */
import { extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractVidmoly(embedUrl, referer = 'https://vidmoly.biz/') {
  try {
    const fixedUrl = embedUrl.replace(/^https?:\/\/(?:www\.)?[^/]+\//i, 'https://vidmoly.biz/');
    const res = await fetch(fixedUrl, {
      headers: {
        'User-Agent': UA,
        Referer: referer,
        Origin: 'https://vidmoly.biz',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const m3u8Match = html.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i) ||
                      html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);

    const m3u8 = m3u8Match ? m3u8Match[1].replace(/\\\//g, '/') : null;
    if (!m3u8) return null;

    const subtitles = extractSubtitlesFromText(html);

    return {
      server: 'VidMoly',
      m3u8,
      directUrl: m3u8,
      referer: 'https://vidmoly.biz/',
      subtitles,
    };
  } catch {
    return null;
  }
}
