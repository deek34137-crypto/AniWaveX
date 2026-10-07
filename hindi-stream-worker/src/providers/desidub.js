/**
 * DesiDub Provider (desidubanime.me)
 * Dedicated Hindi & Multi-Audio Anime Streaming Provider
 */
import { BaseProvider } from './base.js';
import { getTitleVariations, getAnilistTitles, scoreTitle, parseEpisodeNumber } from '../utils/matching.js';
import { extractVidmoly } from '../extractors/vidmoly.js';
import { extractStreamRuby } from '../extractors/ruby.js';
import { extractStreamWish } from '../extractors/streamwish.js';
import { extractVidHide } from '../extractors/vidhide.js';
import { extractCloud } from '../extractors/cloud.js';
import { unpackPacked, extractM3u8FromText, extractSubtitlesFromText } from '../utils/unpacker.js';

const BASE = 'https://www.desidubanime.me';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${BASE}/`,
};

function isDeadOrBlockedDomain(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('short.ink') ||
    lower.includes('vidstreaming.xyz') ||
    lower.includes('ww19.') ||
    lower.includes('animeapps.top')
  );
}

export class DesiDubProvider extends BaseProvider {
  constructor() {
    super({
      id: 'desidub',
      name: 'DesiDub',
      languages: ['hi'],
      type: 'hindi',
      priority: 9,
      enabled: true,
    });

    this.cachedNonce = null;
    this.nonceExpiresAt = 0;
  }

  async getSearchNonce() {
    const now = Date.now();
    if (this.cachedNonce && now < this.nonceExpiresAt) {
      return this.cachedNonce;
    }
    try {
      const res = await fetch(`${BASE}/`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/"search_actions":\s*"([a-f0-9]+)"/i) ||
                      text.match(/nonce['"]?\s*:\s*['"]([a-f0-9]+)['"]/i);
        if (match) {
          this.cachedNonce = match[1];
          this.nonceExpiresAt = now + 12 * 60 * 60 * 1000;
          return this.cachedNonce;
        }
      }
    } catch {}
    return this.cachedNonce || '248d7f7bcc';
  }

  async search(query) {
    const clean = query.trim();
    if (!clean) return [];

    const results = [];

    // 1. Instant Search API
    try {
      const nonce = await this.getSearchNonce();
      const apiUrl = `${BASE}/wp-admin/admin-ajax.php?action=instant_search&query=${encodeURIComponent(clean)}&nonce=${encodeURIComponent(nonce)}`;
      const res = await fetch(apiUrl, {
        headers: {
          ...HEADERS,
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const html = data?.data?.html || (typeof data?.html === 'string' ? data.html : '');
        if (html) {
          const linkMatches = [...html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+\/anime\/([^"'\/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)];
          for (const m of linkMatches) {
            const slug = m[2];
            const titleMatch = m[3].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || m[3].match(/title=["']([^"']+)["']/i);
            const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug.replace(/-/g, ' ');
            const imgMatch = m[3].match(/src=["']([^"']+)["']/i) || m[3].match(/data-src=["']([^"']+)["']/i);

            if (slug && !results.some((r) => r.slug === slug)) {
              results.push({
                id: slug,
                slug,
                title: rawTitle,
                type: 'series',
                url: m[1],
                image: imgMatch ? imgMatch[1] : undefined,
                provider: this.id,
              });
            }
          }
        }
      }
    } catch {}

    // 2. Advanced Search POST fallback
    if (results.length === 0) {
      try {
        const nonce = await this.getSearchNonce();
        const postRes = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
          method: 'POST',
          headers: {
            ...HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: new URLSearchParams({
            action: 'advanced_search',
            s_keyword: clean,
            nonce,
          }).toString(),
          signal: AbortSignal.timeout(4500),
        });

        if (postRes.ok) {
          const data = await postRes.json().catch(() => ({}));
          const html = data?.data?.html || (typeof data?.data === 'string' ? data.data : '');
          if (html) {
            const matches = [...html.matchAll(/href=["']https?:\/\/[^"']+\/(?:anime|watch)\/([^"'\/]+)\/?["']/gi)];
            for (const m of matches) {
              const slug = m[1].replace(/-episode-\d+/, '').replace(/-movie/, '');
              if (slug && !results.some((r) => r.slug === slug)) {
                results.push({
                  id: slug,
                  slug,
                  title: slug.replace(/-/g, ' '),
                  type: 'series',
                  url: `${BASE}/anime/${slug}/`,
                  provider: this.id,
                });
              }
            }
          }
        }
      } catch {}
    }

    // 3. WP search HTML fallback
    if (results.length === 0) {
      try {
        const res = await fetch(`${BASE}/?s=${encodeURIComponent(clean)}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const html = await res.text();
          const matches = [...html.matchAll(/href=["']https?:\/\/[^"']+\/(?:anime|watch)\/([^"'\/]+)\/?["']/gi)];
          for (const m of matches) {
            const slug = m[1].replace(/-episode-\d+/, '').replace(/-movie/, '');
            if (slug && !results.some((r) => r.slug === slug)) {
              results.push({
                id: slug,
                slug,
                title: slug.replace(/-/g, ' '),
                type: 'series',
                url: `${BASE}/anime/${slug}/`,
                provider: this.id,
              });
            }
          }
        }
      } catch {}
    }

    return results;
  }

  async resolveSlug(queryOrId, fallbackTitle = '') {
    const candidateQueries = [];

    if (queryOrId && !/^\d+$/.test(queryOrId)) {
      candidateQueries.push(queryOrId);
    }

    if (fallbackTitle) {
      candidateQueries.push(...getTitleVariations(fallbackTitle));
    }

    if (queryOrId && /^\d+$/.test(queryOrId)) {
      const anilistTitles = await getAnilistTitles(queryOrId);
      candidateQueries.push(...anilistTitles);
    }

    let allResults = [];
    for (const q of candidateQueries) {
      const clean = q.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
      if (!clean) continue;
      const results = await this.search(clean);
      allResults.push(...results);
      if (results.some((r) => scoreTitle(clean, r.title) >= 80)) break;
    }

    const unique = allResults.filter(
      (item, idx, self) => self.findIndex((c) => c.slug === item.slug) === idx
    );

    if (unique.length > 0) {
      let bestSlug = null;
      let bestScore = -1;
      const checkTitle = fallbackTitle || (typeof queryOrId === 'string' ? queryOrId : '');

      for (const item of unique) {
        const score = scoreTitle(checkTitle, item.title);
        if (score > bestScore) {
          bestScore = score;
          bestSlug = item.slug;
        }
      }
      if (bestScore >= 50 && bestSlug) return bestSlug;
      return unique[0].slug;
    }

    // Direct slug fallback guess
    if (fallbackTitle) {
      const slugGuess = fallbackTitle
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      try {
        const probe = await fetch(`${BASE}/anime/${slugGuess}/`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(3000),
        });
        if (probe.ok) return slugGuess;
      } catch {}
    }

    return null;
  }

  async getEpisodes(seriesSlug) {
    let res = null;
    let html = '';

    try {
      res = await fetch(`${BASE}/anime/${seriesSlug}/`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch {}

    // Stale slug recovery
    if (!res || !res.ok) {
      const query = seriesSlug.replace(/-/g, ' ').replace(/\b(?:season|part)\s*\d+\b/gi, '').trim();
      if (query) {
        const alts = await this.search(query);
        for (const alt of alts.slice(0, 3)) {
          if (alt.slug === seriesSlug) continue;
          try {
            const retryRes = await fetch(`${BASE}/anime/${alt.slug}/`, {
              headers: HEADERS,
              signal: AbortSignal.timeout(4000),
            });
            if (retryRes.ok) {
              html = await retryRes.text();
              break;
            }
          } catch {}
        }
      }
    }

    if (!html) throw new Error(`Failed to load DesiDub anime page for ${seriesSlug}`);

    const episodes = [];

    // 1. Static HTML list extraction
    const epMatches = [...html.matchAll(/href=["'](https?:\/\/[^"']+\/watch\/([^"'\/]+)\/?)["'][^>]*>([\s\S]*?)<\/(?:a|li)>/gi)];
    for (const m of epMatches) {
      const epSlug = m[2];
      const linkText = m[3].replace(/<[^>]+>/g, '').trim();
      const numMatch = linkText.match(/Episode\s*(\d+(?:\.\d+)?)/i) || epSlug.match(/episode-(\d+(?:\.\d+)?)/i);
      const num = numMatch ? parseFloat(numMatch[1]) : episodes.length + 1;

      if (epSlug && !episodes.some((e) => e.id === epSlug)) {
        episodes.push({
          id: epSlug,
          number: num,
          season: 1,
          title: `Episode ${num}`,
          audio: 'hi',
          provider: this.id,
        });
      }
    }

    // 2. AJAX get_episodes fallback if static list empty
    if (episodes.length === 0) {
      const postMatch = html.match(/postId\s*[:=]\s*["'](\d+)["']/i) ||
                        html.match(/data-season=["'](\d+)["']/i) ||
                        html.match(/showWatchlistModal\('#watchlist-(\d+)'\)/i);
      if (postMatch) {
        const postId = postMatch[1];
        try {
          const ajaxRes = await fetch(`${BASE}/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${postId}&page=1&order=asc`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(5000),
          });
          if (ajaxRes.ok) {
            const data = await ajaxRes.json().catch(() => ({}));
            if (Array.isArray(data?.data?.episodes)) {
              for (const ep of data.data.episodes) {
                const epUrl = ep.url || '';
                const epSlugMatch = epUrl.match(/\/watch\/([^/]+)\//);
                const epSlug = epSlugMatch ? epSlugMatch[1] : '';
                const num = parseFloat(String(ep.meta_number || ep.number).replace(/[^0-9.]/g, '')) || episodes.length + 1;

                if (epSlug && !episodes.some((e) => e.id === epSlug)) {
                  episodes.push({
                    id: epSlug,
                    number: num,
                    season: 1,
                    title: ep.title || `Episode ${num}`,
                    audio: 'hi',
                    provider: this.id,
                  });
                }
              }
            }
          }
        } catch {}
      }
    }

    episodes.sort((a, b) => a.number - b.number);
    return episodes;
  }

  async getStreams(seriesSlug, epIdentifier, options = {}) {
    const workerOrigin = options.workerOrigin || '';
    const epNum = parseEpisodeNumber(epIdentifier);

    // Candidates for episode watch slug
    const epSlugCandidates = [
      `${seriesSlug}-episode-${epNum}`,
      `${seriesSlug}-${epNum}`,
      `episode-${epNum}`,
    ];

    let watchHtml = '';
    let usedEpSlug = '';

    for (const cand of epSlugCandidates) {
      try {
        const res = await fetch(`${BASE}/watch/${cand}/`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          watchHtml = await res.text();
          usedEpSlug = cand;
          break;
        }
      } catch {}
    }

    // Fallback: search episode in series page
    if (!watchHtml) {
      try {
        const episodes = await this.getEpisodes(seriesSlug);
        const ep = episodes.find((e) => Math.round(e.number) === epNum) || episodes[0];
        if (ep) {
          const res = await fetch(`${BASE}/watch/${ep.id}/`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(4500),
          });
          if (res.ok) {
            watchHtml = await res.text();
            usedEpSlug = ep.id;
          }
        }
      } catch {}
    }

    if (!watchHtml) {
      throw new Error(`Watch page not found on DesiDub for ${seriesSlug} episode ${epIdentifier}`);
    }

    const streams = [];
    const subtitles = [];

    // Parse data-embed-id attributes
    const embedIdMatches = [...watchHtml.matchAll(/data-embed-id=["']([^"']+)["']/g)].map((m) => m[1]);

    for (const matchStr of embedIdMatches) {
      if (!matchStr || !matchStr.includes(':')) continue;
      try {
        const [nameB64, urlB64] = matchStr.split(':');
        const padName = nameB64 + '='.repeat((4 - (nameB64.length % 4)) % 4);
        const padUrl = urlB64 + '='.repeat((4 - (urlB64.length % 4)) % 4);

        const name = atob(padName).trim();
        let embedUrl = atob(padUrl).trim();

        if (embedUrl.includes('<iframe')) {
          const srcMatch = embedUrl.match(/src=['"]([^'"]+)['"]/i);
          if (srcMatch) embedUrl = srcMatch[1];
        }

        if (!embedUrl || !embedUrl.startsWith('http') || isDeadOrBlockedDomain(embedUrl)) {
          continue;
        }

        // 1. VidMoly
        if (embedUrl.includes('vidmoly.')) {
          const vmResult = await extractVidmoly(embedUrl, `${BASE}/`);
          if (vmResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(vmResult.m3u8)}&ref=${encodeURIComponent(vmResult.referer)}`
              : vmResult.m3u8;

            streams.push({
              server: 'VidMoly (Hindi HLS)',
              url: proxiedUrl,
              directUrl: vmResult.m3u8,
              type: 'hls',
              quality: 'VidMoly [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: vmResult.referer },
            });
            if (vmResult.subtitles?.length) subtitles.push(...vmResult.subtitles);
            continue;
          }
        }

        // 2. StreamRuby / RubyVidHub
        if (embedUrl.includes('rubyvidhub.') || embedUrl.includes('streamruby.') || embedUrl.includes('rubystream.')) {
          const rubyResult = await extractStreamRuby(embedUrl, `${BASE}/`);
          if (rubyResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(rubyResult.m3u8)}&ref=${encodeURIComponent(rubyResult.referer)}`
              : rubyResult.m3u8;

            streams.push({
              server: 'StreamRuby (Hindi HLS)',
              url: proxiedUrl,
              directUrl: rubyResult.m3u8,
              type: 'hls',
              quality: 'StreamRuby [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: rubyResult.referer },
            });
            if (rubyResult.subtitles?.length) subtitles.push(...rubyResult.subtitles);
            continue;
          }
        }

        // 3. Cloud (cloud.desidubanime.me)
        if (embedUrl.includes('cloud.desidubanime.me')) {
          const cloudResult = await extractCloud(embedUrl);
          if (cloudResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(cloudResult.m3u8)}&ref=${encodeURIComponent(cloudResult.referer)}`
              : cloudResult.m3u8;

            streams.push({
              server: 'Cloud (Hindi HLS)',
              url: proxiedUrl,
              directUrl: cloudResult.m3u8,
              type: 'hls',
              quality: 'DesiDub Cloud [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: cloudResult.referer },
            });
            if (cloudResult.subtitles?.length) subtitles.push(...cloudResult.subtitles);
            continue;
          }
        }

        // 4. StreamWish / FileLions
        if (embedUrl.includes('streamwish.') || embedUrl.includes('filelions.') || embedUrl.includes('cdnwish.')) {
          const wishResult = await extractStreamWish(embedUrl);
          if (wishResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(wishResult.m3u8)}&ref=${encodeURIComponent(wishResult.referer)}`
              : wishResult.m3u8;

            streams.push({
              server: 'StreamWish (Hindi HLS)',
              url: proxiedUrl,
              directUrl: wishResult.m3u8,
              type: 'hls',
              quality: 'StreamWish [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: wishResult.referer },
            });
            if (wishResult.subtitles?.length) subtitles.push(...wishResult.subtitles);
            continue;
          }
        }

        // 5. VidHide
        if (embedUrl.includes('vidhide.') || embedUrl.includes('streamhide.')) {
          const hideResult = await extractVidHide(embedUrl);
          if (hideResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(hideResult.m3u8)}&ref=${encodeURIComponent(hideResult.referer)}`
              : hideResult.m3u8;

            streams.push({
              server: 'VidHide (Hindi HLS)',
              url: proxiedUrl,
              directUrl: hideResult.m3u8,
              type: 'hls',
              quality: 'VidHide [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: hideResult.referer },
            });
            if (hideResult.subtitles?.length) subtitles.push(...hideResult.subtitles);
            continue;
          }
        }

        // 6. Direct m3u8 scan fallback on the embed URL
        try {
          const probe = await fetch(embedUrl, {
            headers: { ...HEADERS, Referer: `${BASE}/` },
            signal: AbortSignal.timeout(3500),
          });
          if (probe.ok) {
            const probeText = await probe.text();
            const unpacked = probeText.includes('eval(function(p,a,c') ? unpackPacked(probeText) : '';
            const searchTarget = unpacked || probeText;
            const directM3u8 = extractM3u8FromText(searchTarget);

            if (directM3u8) {
              const proxiedUrl = workerOrigin
                ? `${workerOrigin}/proxy?url=${encodeURIComponent(directM3u8)}&ref=${encodeURIComponent(embedUrl)}`
                : directM3u8;

              streams.push({
                server: `${name || 'DesiDub'} (Hindi HLS)`,
                url: proxiedUrl,
                directUrl: directM3u8,
                type: 'hls',
                quality: `${name || 'DesiDub'} [Hindi Dub]`,
                isM3U8: true,
                hasHindi: true,
                isHindi: true,
                headers: { Referer: embedUrl },
              });
              const subs = extractSubtitlesFromText(searchTarget);
              if (subs.length) subtitles.push(...subs);
              continue;
            }
          }
        } catch {}

        // Fallback: Embed
        streams.push({
          server: `${name || 'DesiDub'} (Hindi Dub)`,
          url: embedUrl,
          type: 'embed',
          quality: `${name || 'DesiDub'} [Hindi Dub]`,
          isM3U8: false,
          isHindi: true,
          hasHindi: true,
        });
      } catch {}
    }

    return {
      provider: this.id,
      streams,
      subtitles,
    };
  }
}

export const desidubProvider = new DesiDubProvider();
