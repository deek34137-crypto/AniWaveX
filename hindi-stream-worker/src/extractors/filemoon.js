/**
 * Filemoon Extractor
 */
import { unpackPacked, extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractFilemoon(embedUrl) {
  try {
    const host = new URL(embedUrl).host;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': UA,
        Referer: `https://${host}/`,
        Origin: `https://${host}`,
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    let html = await res.text();

    if (!html.includes('m3u8') && html.includes('<iframe')) {
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch) {
        const subRes = await fetch(iframeMatch[1], {
          headers: { 'User-Agent': UA, Referer: embedUrl },
          signal: AbortSignal.timeout(3500),
        });
        if (subRes.ok) html = await subRes.text();
      }
    }

    const unpacked = html.includes('eval(function(p,a,c') ? unpackPacked(html) : '';
    const searchTarget = unpacked || html;

    let m3u8 = extractM3u8FromText(searchTarget);
    if (!m3u8) {
      const fileMatch = searchTarget.match(/\{file:\s*["']([^"']+)["']/i);
      if (fileMatch) m3u8 = fileMatch[1];
    }

    if (!m3u8) return null;

    const subtitles = extractSubtitlesFromText(searchTarget);

    return {
      server: 'FileMoon',
      m3u8,
      directUrl: m3u8,
      referer: `https://${host}/`,
      subtitles,
    };
  } catch {
    return null;
  }
}
