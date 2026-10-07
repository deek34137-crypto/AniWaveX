/**
 * Pure JavaScript Dean Edwards Packed JS Unpacker
 * Handles: eval(function(p,a,c,k,e,d)...)
 *
 * Compatible with Cloudflare Workers (pure string manipulation, zero Node APIs)
 */

export function unpackPacked(packed) {
  if (!packed || typeof packed !== 'string') return '';

  const match = packed.match(
    /eval\(function\(p,a,c,k,e,[rd]\)\{[\s\S]*?return\s+p;?\}\s*\(\s*['"]([\s\S]*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]([\s\S]*?)['"]\.split\(['"]\|['"]\)/
  );
  if (match) {
    const [, p, aStr, cStr, kStr] = match;
    return decodePacked(p, parseInt(aStr, 10), parseInt(cStr, 10), kStr.split('|'));
  }

  const fallbackMatch = packed.match(
    /}\s*\(\s*['"]([\s\S]*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]([\s\S]*?)['"]\.split\(['"]\|['"]\)/
  );
  if (fallbackMatch) {
    const [, p, aStr, cStr, kStr] = fallbackMatch;
    return decodePacked(p, parseInt(aStr, 10), parseInt(cStr, 10), kStr.split('|'));
  }

  return '';
}

function decodePacked(p, radix, count, dict) {
  function toBase(val, rad) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    while (val > 0) {
      res = chars[val % rad] + res;
      val = Math.floor(val / rad);
    }
    return res || '0';
  }

  for (let i = count - 1; i >= 0; i--) {
    const key = toBase(i, radix);
    const val = dict[i] || key;
    const reg = new RegExp('\\b' + key + '\\b', 'g');
    p = p.replace(reg, val);
  }
  return p;
}

/**
 * Extracts .m3u8 links from raw or unpacked code
 */
export function extractM3u8FromText(text) {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
  return match ? match[1].replace(/\\\//g, '/').replace(/&amp;/g, '&') : null;
}

/**
 * Extracts .vtt/.srt subtitle tracks from HTML or unpacked JavaScript
 */
export function extractSubtitlesFromText(text) {
  if (!text) return [];
  const subtitles = [];
  const vttMatches = text.match(/["'](https?:\/\/[^\s"']+\.(?:vtt|srt)[^\s"']*)["']/gi) || [];

  for (const raw of vttMatches) {
    const v = raw.replace(/["']/g, '').replace(/\\\//g, '/').trim();
    if (v.includes('_sli') || v.toLowerCase().includes('thumb')) continue;

    let lang = 'English';
    const low = v.toLowerCase();
    if (low.includes('hin')) lang = 'Hindi';
    else if (low.includes('tam')) lang = 'Tamil';
    else if (low.includes('tel')) lang = 'Telugu';
    else if (low.includes('jap') || low.includes('jpn')) lang = 'Japanese';
    else if (low.includes('eng')) lang = 'English';

    if (!subtitles.some((s) => s.url === v)) {
      subtitles.push({
        url: v,
        lang,
        label: lang,
        kind: 'subtitle',
        default: lang === 'Hindi',
      });
    }
  }
  return subtitles;
}
