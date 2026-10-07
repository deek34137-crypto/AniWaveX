/**
 * ToonStream Provider
 * Scrapes & extracts Hindi-dubbed anime from ToonStream mirrors
 */
import { BaseProvider } from './base.js';
import { getTitleVariations, getAnilistTitles, parseEpisodeNumber } from '../utils/matching.js';
import { extractVidmoly } from '../extractors/vidmoly.js';
import { extractAsCdn } from '../extractors/ascdn.js';
import { extractStreamRuby } from '../extractors/ruby.js';
import { extractStreamWish } from '../extractors/streamwish.js';
import { extractVidHide } from '../extractors/vidhide.js';
import { extractFilemoon } from '../extractors/filemoon.js';
import { extractTurbovid } from '../extractors/turbovid.js';

const DOMAINS_SYNC_URL = 'https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json';
const KNOWN_MIRRORS = ['https://toonstream.us', 'https://toonstream.vip', 'https://toonstream.org', 'https://toonstream.shop'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

export class ToonStreamProvider extends BaseProvider {
  constructor() {
    super({
      id: 'toonstream',
      name: 'ToonStream',
      languages: ['hi'],
      type: 'hindi',
      priority: 10,
      enabled: true,
    });

    this.cachedBase = 'https://toonstream.us';
    this.lastDomainCheck = 0;
  }

  async getBaseUrl() {
    const now = Date.now();
    if (now - this.lastDomainCheck < 1800000 && this.cachedBase) {
      return this.cachedBase;
    }

    // 1. Check TVVVV remote domain sync
    try {
      const res = await fetch(DOMAINS_SYNC_URL, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.toonstream && data.toonstream.startsWith('http')) {
          const remoteDomain = data.toonstream.replace(/\/+$/, '');
          const probe = await fetch(remoteDomain, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(3000),
            redirect: 'follow',
          });
          if (probe.ok) {
            const finalUrl = new URL(probe.url).origin;
            const text = await probe.text();
            if (text.includes('/search/all') || (text.includes('ToonStream') && !text.includes('/lander'))) {
              this.cachedBase = finalUrl;
              this.lastDomainCheck = now;
              return this.cachedBase;
            }
          }
        }
      }
    } catch {}

    // 2. Test known active mirrors in priority order
    for (const mirror of KNOWN_MIRRORS) {
      try {
        const probe = await fetch(mirror, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(3000),
          redirect: 'follow',
        });
        if (probe.ok) {
          const finalUrl = new URL(probe.url).origin;
          const text = await probe.text();
          if (text.includes('/search/all') || (text.includes('ToonStream') && !text.includes('/lander'))) {
            this.cachedBase = finalUrl;
            this.lastDomainCheck = now;
            return this.cachedBase;
          }
        }
      } catch {}
    }

    this.cachedBase = 'https://toonstream.us';
    this.lastDomainCheck = now;
    return this.cachedBase;
  }

  getHeaders(base) {
    return {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: `${base}/`,
    };
  }

  async search(query) {
    const base = await this.getBaseUrl();
    const headers = this.getHeaders(base);
    const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (!cleanQuery) return [];

    // 1. Instant search/all endpoint (JSON)
    try {
      const searchUrl = `${base}/search/all?q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.data) && data.data.length > 0) {
          return data.data.map((item) => ({
            id: item.url.replace(/^\/(?:series|movies|anime)\//, '').replace(/\/$/, ''),
            slug: item.url.replace(/^\/(?:series|movies|anime)\//, '').replace(/\/$/, ''),
            title: item.title,
            type: item.type || 'series',
            url: item.url.startsWith('http') ? item.url : `${base}${item.url}`,
            provider: this.id,
          }));
        }
      }
    } catch {}

    // 2. Kiranime WP REST API
    try {
      const apiUrl = `${base}/wp-json/kiranime/v1/anime/search?query=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const html = data?.result || '';
        const matches = [...html.matchAll(/<a[^>]*href=["'](https?:\/\/[^"']+\/anime\/([^"'/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)];
        if (matches.length > 0) {
          return matches.map((m) => {
            const titleMatch = m[3].match(/alt=["']([^"']+)["']/i) || m[3].match(/<span[^>]*>([^<]+)<\/span>/i);
            const title = titleMatch ? titleMatch[1].trim() : m[2].replace(/-/g, ' ');
            return {
              id: m[2],
              slug: m[2],
              title,
              type: 'series',
              url: m[1],
              provider: this.id,
            };
          });
        }
      }
    } catch {}

    // 3. WP search HTML
    try {
      const searchUrl = `${base}/?s=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const html = await res.text();
        const matches = [...html.matchAll(/href=["'](https?:\/\/[^"']+\/(?:anime|series)\/([^"'/]+)\/?)["']/gi)];
        const unique = new Map();
        for (const m of matches) {
          if (!unique.has(m[2])) {
            unique.set(m[2], {
              id: m[2],
              slug: m[2],
              title: m[2].replace(/-/g, ' '),
              type: 'series',
              url: m[1],
              provider: this.id,
            });
          }
        }
        if (unique.size > 0) {
          return Array.from(unique.values());
        }
      }
    } catch {}

    return [];
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

    for (const q of candidateQueries) {
      const clean = q.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
      if (!clean) continue;
      const results = await this.search(clean);
      if (results.length > 0) {
        const hindiNamed = results.find(
          (r) => /hindi|sony\s*yay|muse/i.test(r.title) && r.type === 'series'
        );
        if (hindiNamed) return hindiNamed.slug;

        const series = results.find((r) => r.type === 'series') || results[0];
        if (series) return series.slug;
      }
    }

    if (queryOrId && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(queryOrId)) {
      return queryOrId;
    }

    return null;
  }

  async getEpisodes(seriesSlug) {
    const base = await this.getBaseUrl();
    const headers = this.getHeaders(base);

    const seriesUrls = [
      `${base}/series/${seriesSlug}/`,
      `${base}/series/${seriesSlug}`,
      `${base}/anime/${seriesSlug}/`,
    ];

    let html = '';
    for (const sUrl of seriesUrls) {
      try {
        const res = await fetch(sUrl, { headers, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          html = await res.text();
          break;
        }
      } catch {}
    }

    if (!html) throw new Error(`Failed to load ToonStream series page for ${seriesSlug}`);

    const episodes = [];
    const seen = new Set();

    // Pattern 1: /episode/slug-1x12/ or /episode/slug-12/
    const epMatches = [...html.matchAll(/href=["']([^"']*\/episode\/([^"'/]+)\/?)["']/g)];
    for (const m of epMatches) {
      const epSlug = m[2];
      if (seen.has(epSlug)) continue;
      seen.add(epSlug);

      const numMatch = epSlug.match(/(\d+)[xX](\d+)/);
      const season = numMatch ? parseInt(numMatch[1], 10) : 1;
      const number = numMatch ? parseInt(numMatch[2], 10) : (parseInt(epSlug.match(/-(\d+)$/)?.[1] || '0', 10) || episodes.length + 1);

      episodes.push({
        id: epSlug,
        number,
        season,
        title: `Episode ${number}`,
        audio: 'hi',
        provider: this.id,
      });
    }

    // Pattern 2: /watch/slug-episode-12/
    const watchMatches = [...html.matchAll(/href=["']([^"']*\/watch\/([^"'/]+)\/?)["']/g)];
    for (const m of watchMatches) {
      const epSlug = m[2];
      if (seen.has(epSlug)) continue;
      seen.add(epSlug);

      const numMatch = epSlug.match(/episode-(\d+)/i) || epSlug.match(/-(\d+)$/);
      const number = numMatch ? parseInt(numMatch[1], 10) : episodes.length + 1;

      episodes.push({
        id: epSlug,
        number,
        season: 1,
        title: `Episode ${number}`,
        audio: 'hi',
        provider: this.id,
      });
    }

    episodes.sort((a, b) => (a.season === b.season ? a.number - b.number : a.season - b.season));
    return episodes;
  }

  async getStreams(seriesSlug, epIdentifier, options = {}) {
    const base = await this.getBaseUrl();
    const headers = this.getHeaders(base);
    const workerOrigin = options.workerOrigin || '';
    const epNum = parseEpisodeNumber(epIdentifier);

    const candidates = [
      `${base}/episode/${seriesSlug}-1x${epNum}/`,
      `${base}/episode/${seriesSlug}-${epNum}/`,
      `${base}/episode/${seriesSlug}-season-1-episode-${epNum}/`,
      `${base}/watch/${seriesSlug}-episode-${epNum}/`,
      `${base}/watch/${seriesSlug}-s1-episode-${epNum}/`,
      `${base}/watch/${seriesSlug}-${epNum}/`,
    ];

    let epHtml = null;
    for (const c of candidates) {
      try {
        const epRes = await fetch(c, { headers, signal: AbortSignal.timeout(4000) });
        if (epRes.ok) {
          epHtml = await epRes.text();
          break;
        }
      } catch {}
    }

    if (!epHtml) {
      try {
        const seriesRes = await fetch(`${base}/series/${seriesSlug}/`, { headers, signal: AbortSignal.timeout(4000) });
        if (seriesRes.ok) {
          const seriesHtml = await seriesRes.text();
          const epRegex = new RegExp(`href=["']((?:https?:\\/\\/[^"']*)?\\/(?:episode|watch)\\/[^"']*?-(?:\\d+x)?${epNum}\\/?)["']`, 'i');
          const match = seriesHtml.match(epRegex);
          if (match) {
            const targetEpUrl = match[1].startsWith('http') ? match[1] : `${base}${match[1]}`;
            const epRes = await fetch(targetEpUrl, { headers, signal: AbortSignal.timeout(4000) });
            if (epRes.ok) {
              epHtml = await epRes.text();
            }
          }
        }
      } catch {}
    }

    if (!epHtml) {
      throw new Error(`Episode ${epIdentifier} not found on ToonStream for series ${seriesSlug}`);
    }

    const streams = [];
    const subtitles = [];

    // 1. Extract base64 embed-ids (VidPlay, StreamRuby, EmbedWish, MyCloud, VidMoly)
    const embedMatches = [...epHtml.matchAll(/embed-id=["']([^"']+)["']/g)].map((m) => m[1]);
    for (const eid of embedMatches) {
      try {
        const parts = eid.split(':');
        const rawServerName = atob(parts[0]).replace(/dub$/i, '').trim();
        let serverUrl = parts[1] ? atob(parts[1]).trim() : '';

        const iframeSrc = serverUrl.match(/src=['"]([^'"]+)['"]/i);
        if (iframeSrc) serverUrl = iframeSrc[1];

        if (serverUrl && serverUrl.startsWith('http') && !isDeadOrBlockedDomain(serverUrl)) {
          const isM3U8 = serverUrl.includes('.m3u8');
          streams.push({
            server: `${rawServerName || 'ToonStream'} (Hindi Dub)`,
            url: serverUrl,
            directUrl: serverUrl,
            type: isM3U8 ? 'hls' : 'embed',
            quality: `${rawServerName || 'ToonStream'} [Hindi Dub]`,
            isM3U8,
            isHindi: true,
            hasHindi: true,
            headers: { Referer: `${base}/` },
          });
        }
      } catch {}
    }

    // 2. Extract standard iframes or video players embedded in the page
    const rawLinks = [
      ...[...epHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
      ...[...epHtml.matchAll(/data-src=["']([^"']+)["']/gi)].map((m) => m[1]),
    ];
    const uniqueServers = [...new Set(rawLinks)].filter(
      (l) =>
        !/\.(jpe?g|png|webp|gif|svg|ico)$/i.test(l.split('?')[0]) &&
        !isDeadOrBlockedDomain(l) &&
        !l.includes('youtube.com') &&
        !l.includes('sharethis.com') &&
        !l.includes('a-ads.com') &&
        !l.includes('chaty') &&
        !l.includes('facebook.com') &&
        !l.includes('twitter.com') &&
        !l.includes('google.com')
    );

    for (const serverUrl of uniqueServers) {
      if (streams.some((s) => s.url === serverUrl)) continue;

      try {
        // A. VidMoly (Direct HLS Extraction)
        if (serverUrl.includes('vidmoly.net') || serverUrl.includes('vidmoly.to') || serverUrl.includes('vidmoly.me') || serverUrl.includes('vidmoly.biz')) {
          const vmResult = await extractVidmoly(serverUrl, `${base}/`);
          if (vmResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(vmResult.m3u8)}&ref=${encodeURIComponent(vmResult.referer)}`
              : vmResult.m3u8;

            streams.unshift({
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

        // B. AS-CDN (FirePlayer Multi-Audio HLS)
        if (/as-cdn\d*\.top/i.test(serverUrl) || serverUrl.includes('awstream') || serverUrl.includes('zephyrflick')) {
          const asResult = await extractAsCdn(serverUrl, `${base}/`);
          if (asResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(asResult.m3u8)}&ref=${encodeURIComponent(asResult.referer)}`
              : asResult.m3u8;

            streams.unshift({
              server: asResult.server,
              url: proxiedUrl,
              directUrl: asResult.m3u8,
              type: 'hls',
              quality: 'Multi-Audio (Hindi)',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              audioTracks: asResult.audioTracks,
              headers: { Referer: asResult.referer, Origin: asResult.origin },
            });
            continue;
          }
        }

        // C. Turbovid (HLS)
        if (serverUrl.includes('emturbovid.com')) {
          const tvResult = await extractTurbovid(serverUrl, `${base}/`);
          if (tvResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(tvResult.m3u8)}&ref=${encodeURIComponent(tvResult.referer)}`
              : tvResult.m3u8;

            streams.unshift({
              server: 'Turbovid (HLS)',
              url: proxiedUrl,
              directUrl: tvResult.m3u8,
              type: 'hls',
              quality: 'Turbovid [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: tvResult.referer },
            });
            continue;
          }
        }

        // D. StreamRuby / RubyVidHub (Direct HLS via unpacker!)
        if (serverUrl.includes('rubyvidhub.') || serverUrl.includes('streamruby.') || serverUrl.includes('rubystream.')) {
          const rubyResult = await extractStreamRuby(serverUrl, `${base}/`);
          if (rubyResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(rubyResult.m3u8)}&ref=${encodeURIComponent(rubyResult.referer)}`
              : rubyResult.m3u8;

            streams.unshift({
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

        // E. StreamWish / FileLions / CdnWish (Direct HLS via unpacker!)
        if (serverUrl.includes('streamwish.') || serverUrl.includes('cdnwish.') || serverUrl.includes('filelions.')) {
          const wishResult = await extractStreamWish(serverUrl);
          if (wishResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(wishResult.m3u8)}&ref=${encodeURIComponent(wishResult.referer)}`
              : wishResult.m3u8;

            streams.unshift({
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

        // F. VidHide / StreamHide (Direct HLS via unpacker!)
        if (serverUrl.includes('vidhide.') || serverUrl.includes('streamhide.') || serverUrl.includes('guccihide.')) {
          const hideResult = await extractVidHide(serverUrl);
          if (hideResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(hideResult.m3u8)}&ref=${encodeURIComponent(hideResult.referer)}`
              : hideResult.m3u8;

            streams.unshift({
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

        // G. Filemoon (Direct HLS via unpacker!)
        if (serverUrl.includes('filemoon.')) {
          const fmResult = await extractFilemoon(serverUrl);
          if (fmResult?.m3u8) {
            const proxiedUrl = workerOrigin
              ? `${workerOrigin}/proxy?url=${encodeURIComponent(fmResult.m3u8)}&ref=${encodeURIComponent(fmResult.referer)}`
              : fmResult.m3u8;

            streams.unshift({
              server: 'FileMoon (Hindi HLS)',
              url: proxiedUrl,
              directUrl: fmResult.m3u8,
              type: 'hls',
              quality: 'FileMoon [Hindi Dub]',
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: fmResult.referer },
            });
            if (fmResult.subtitles?.length) subtitles.push(...fmResult.subtitles);
            continue;
          }
        }

        // H. Fallback iframe embeds
        const serverLabel = serverUrl.includes('ruby')
          ? 'Ruby'
          : serverUrl.includes('wish')
          ? 'Streamwish'
          : serverUrl.includes('abyss')
          ? 'AbyssPlayer'
          : serverUrl.includes('cloudy')
          ? 'Cloudy'
          : serverUrl.includes('filesforever')
          ? 'FilesForever'
          : serverUrl.includes('blakiteapi')
          ? 'Blakite'
          : 'External Embed';

        streams.push({
          server: `${serverLabel} (Hindi Dub)`,
          url: serverUrl,
          type: 'embed',
          quality: `${serverLabel} [Hindi Dub]`,
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

export const toonstreamProvider = new ToonStreamProvider();
