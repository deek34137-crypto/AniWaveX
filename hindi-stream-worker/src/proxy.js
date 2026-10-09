/**
 * Secure HLS & Video Stream Proxy
 *
 * Features:
 * - Domain allowlist & SSRF protection (blocks private IP space & non-media domains)
 * - M3U8 playlist rewriting (rewrites keys, variants, audio tracks, and TS segments)
 * - Hindi audio track prioritization (ensures DEFAULT=YES,AUTOSELECT=YES for Hindi audio)
 * - Subtitle streaming & CORS headers
 */

const ALLOWED_DOMAIN_PATTERNS = [
  /vidmoly\.(net|to|me|biz)/i,
  /as-cdn\d*\.top/i,
  /emturbovid\.com/i,
  /ruby(vidhub|stream)\.com/i,
  /streamruby\.com/i,
  /streamwish\.(com|to|top)/i,
  /cdnwish\.(com|to)/i,
  /filelions\.(com|to)/i,
  /vidhide\.(com|to|net)/i,
  /streamhide\.(com|to)/i,
  /filemoon\.(sx|to|nl)/i,
  /cloud\.desidubanime\.me/i,
  /desidubanime\.me/i,
  /toonstream\.(us|vip|org|shop)/i,
  /gdmirrorbot\.nl/i,
  /dramiyos-cdn/i,
  /earnvids\.(com|net)/i,
  /smoothpre\.(com|net)/i,
  /abyss(player)?\.(com|to)/i,
  /workers\.dev/i,
  /akamaized\.net/i,
  /b-cdn\.net/i,
  /bunnycdn\.com/i,
  /cloudfront\.net/i,
  /atomic4cdn\.top/i,
  /flixcloud\.cc/i,
];

function isPrivateIpOrHost(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '0.0.0.0' ||
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('127.') ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:')
  ) {
    return true;
  }
  // 172.16.0.0 to 172.31.255.255
  const match172 = lower.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

export function isAllowedProxyUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (isPrivateIpOrHost(parsed.hostname)) return false;

    // Check hostname against allowed media and CDN domain patterns
    return ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
  } catch {
    return false;
  }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function handleProxyRequest(request, fallbackBase = 'https://toonstream.us') {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const referer = url.searchParams.get('ref') || `${fallbackBase}/`;

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!isAllowedProxyUrl(targetUrl)) {
    return new Response(JSON.stringify({ error: 'Target host not permitted by proxy policy' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const origin = new URL(targetUrl).origin;
    const fetchHeaders = {
      'User-Agent': UA,
      Referer: referer,
      Origin: origin,
    };

    // Forward Range header if client requested byte-range (critical for MP4 & TS seek)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000),
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');

    if (isM3u8) {
      let text = await upstreamRes.text();
      const targetBase = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const workerOrigin = url.origin;

      // Track if Hindi or any audio track is marked DEFAULT=YES
      let hasHindiDefault = false;
      const lines = text.split(/\r?\n/);

      for (const line of lines) {
        if (
          line.includes('#EXT-X-MEDIA:TYPE=AUDIO') &&
          (/LANGUAGE="hin"/i.test(line) || /NAME="Hindi"/i.test(line)) &&
          line.includes('DEFAULT=YES')
        ) {
          hasHindiDefault = true;
          break;
        }
      }

      let hindiPromoted = false;

      // Process lines: rewrite URLs & ensure Hindi audio track is promoted to default
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        let processed = line;

        // If Hindi audio track exists, ensure it is promoted to DEFAULT=YES
        if (processed.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
          const isHindi = /LANGUAGE="hin"/i.test(processed) || /NAME="[^"]*hindi[^"]*"/i.test(processed);
          if (isHindi) {
            if (/DEFAULT=/i.test(processed)) {
              processed = processed.replace(/DEFAULT=(NO|YES)/ig, 'DEFAULT=YES');
            } else {
              processed += ',DEFAULT=YES';
            }
            if (/AUTOSELECT=/i.test(processed)) {
              processed = processed.replace(/AUTOSELECT=(NO|YES)/ig, 'AUTOSELECT=YES');
            } else {
              processed += ',AUTOSELECT=YES';
            }
            hindiPromoted = true;
          } else if (hasHindiDefault || hindiPromoted) {
            processed = processed.replace(/DEFAULT=YES/ig, 'DEFAULT=NO');
          }
        }

        // Rewrite URI="..." attributes inside directives (KEY, MEDIA, etc.)
        if (processed.startsWith('#') && processed.includes('URI=')) {
          return processed.replace(/URI="([^"]+)"/g, (_m, uri) => {
            let absUri = uri;
            if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
              absUri = uri.startsWith('/') ? `${origin}${uri}` : `${targetBase}${uri}`;
            }
            return `URI="${workerOrigin}/proxy?url=${encodeURIComponent(absUri)}&ref=${encodeURIComponent(referer)}"`;
          });
        }

        if (processed.startsWith('#')) return processed;

        // Non-# lines are segment or variant URLs
        let absSegment = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          absSegment = trimmed.startsWith('/') ? `${origin}${trimmed}` : `${targetBase}${trimmed}`;
        }
        return `${workerOrigin}/proxy?url=${encodeURIComponent(absSegment)}&ref=${encodeURIComponent(referer)}`;
      });

      return new Response(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    // Binary content (TS segments, video chunks, MP4, WebVTT subtitles)
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=86400');

    if (contentType) responseHeaders.set('Content-Type', contentType);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const acceptRanges = upstreamRes.headers.get('accept-ranges');
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Proxy Error: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
