/**
 * AS-CDN / FirePlayer / AWSStream Multi-Audio HLS Extractor
 */
import { unpackPacked } from '../utils/unpacker.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function extractAsCdn(embedUrl, baseReferer = 'https://toonstream.us/') {
  try {
    const urlObj = new URL(embedUrl);
    const domain = urlObj.host;
    let hash = urlObj.pathname.split('/').filter(Boolean).pop() || '';

    // If hash is short (<30 chars) or nested, inspect page for FirePlayer or packed JS
    if (hash.length < 30) {
      try {
        const pageRes = await fetch(embedUrl, {
          headers: { 'User-Agent': UA, Referer: baseReferer },
          signal: AbortSignal.timeout(3500),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const fpMatch = html.match(/FirePlayer\s*\(\s*["']([^"']+)["']/i);
          if (fpMatch) {
            hash = fpMatch[1];
          } else if (html.includes('eval(function(p,a,c')) {
            const unpacked = unpackPacked(html);
            const unpackedFp = unpacked.match(/FirePlayer\s*\(\s*["']([^"']+)["']/i);
            if (unpackedFp) hash = unpackedFp[1];
          }
        }
      } catch {}
    }

    if (!hash) return null;

    const postUrl = `https://${domain}/player/index.php?data=${hash}&do=getVideo`;
    const postRes = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: embedUrl,
        Origin: `https://${domain}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({ hash, r: baseReferer }).toString(),
      signal: AbortSignal.timeout(4500),
    });

    if (!postRes.ok) return null;
    const videoData = await postRes.json();
    const masterUrl = videoData.securedLink || videoData.videoSource;
    if (!masterUrl) return null;

    let audioTracks = [
      { language: 'hin', name: 'Hindi' },
      { language: 'eng', name: 'English' },
      { language: 'jpn', name: 'Japanese' },
      { language: 'tam', name: 'Tamil' },
      { language: 'tel', name: 'Telugu' },
    ];

    try {
      const plRes = await fetch(masterUrl, {
        headers: { 'User-Agent': UA, Referer: `https://${domain}/` },
        signal: AbortSignal.timeout(3000),
      });
      if (plRes.ok) {
        const plText = await plRes.text();
        const audios = [
          ...plText.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="([^"]+)".*?NAME="([^"]+)"/g),
        ].map((a) => ({ language: a[1], name: a[2] }));
        if (audios.length > 0) audioTracks = audios;
      }
    } catch {}

    return {
      server: 'AS-CDN (Hindi / Multi-Audio HLS)',
      m3u8: masterUrl,
      directUrl: masterUrl,
      referer: `https://${domain}/`,
      origin: `https://${domain}`,
      audioTracks,
      subtitles: [],
    };
  } catch {
    return null;
  }
}
