/**
 * AniWaveX Universal Hindi Streaming Worker (v2.0.0)
 * Edge-Optimized Multi-Provider Aggregator for Hindi & Indian Regional Anime Dubs
 *
 * Integrated Providers:
 * - ToonStream (Multi-mirror sync, Kiranime embeds, VidMoly, AS-CDN, Turbovid, Ruby, Wish, VidHide, Filemoon)
 * - DesiDub (Instant search, AJAX multi-page catalog, VidMoly, StreamRuby, Cloud, EarnVids, Mirror)
 *
 * Capabilities:
 * - Dean Edwards packed JavaScript deobfuscation (extracts raw HLS streams from packed JS)
 * - Multi-Audio Hindi Auto-Selection (rewrites HLS master playlists to enforce Hindi audio track as default)
 * - Intelligent tiered provider failover & circuit breaker health system
 * - Hardened streaming proxy with SSRF protection and approved video CDN allowlist
 * - 100% backward compatible API contract
 */

import { providerRegistry } from './src/registry.js';
import { healthManager } from './src/health.js';
import { handleProxyRequest } from './src/proxy.js';
import { toonstreamProvider } from './src/providers/toonstream.js';
import { desidubProvider } from './src/providers/desidub.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'public, max-age=180',
    },
  });
}

function corsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return corsOptions();
    }

    // 1. Health check & Diagnostics
    if (path === '/health' || path === '/' || path === '/diagnostic') {
      const toonstreamBase = await toonstreamProvider.getBaseUrl();
      const stats = healthManager.getStats();

      return json({
        name: 'AniWaveX Universal Hindi Streaming Worker',
        status: 'ok',
        version: '2.0.0',
        activeProviders: providerRegistry.getProviders().map((p) => ({
          id: p.id,
          name: p.name,
          languages: p.languages,
          priority: p.priority,
          health: stats[p.id] || { status: 'healthy', successes: 0, failures: 0 },
        })),
        activeUpstream: {
          toonstream: toonstreamBase,
          desidub: 'https://www.desidubanime.me',
        },
        features: [
          'multi-provider-aggregation',
          'dean-edwards-unpacker',
          'hindi-audio-prioritization',
          'circuit-breaker-failover',
          'vidmoly-hls',
          'ascdn-multi-audio-hls',
          'streamruby-hls',
          'streamwish-hls',
          'vidhide-hls',
          'filemoon-hls',
          'desidub-cloud-hls',
          'ssrf-hardened-proxy',
        ],
        routes: [
          '/health',
          '/diagnostic',
          '/search?q=:query[&provider=toonstream|desidub]',
          '/episodes?slug=:slug[&provider=...]',
          '/episodes/:slug',
          '/stream?id=:anilistId&ep=:ep&title=:title[&provider=...]',
          '/watch/:slug/:ep',
          '/watch/toonstream/:slug/dub/toonstream-:ep',
          '/watch/desidub/:slug/dub/desidub-:ep',
          '/watch/hindi/:slug/dub/hindi-:ep',
          '/proxy?url=:url&ref=:ref',
        ],
      });
    }

    // 2. Proxy Route
    if (path === '/proxy') {
      const activeBase = await toonstreamProvider.getBaseUrl();
      return handleProxyRequest(request, activeBase);
    }

    // 3. Search Route
    if (path === '/search') {
      const q = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
      if (!q) return json({ error: "Missing query parameter 'q'" }, 400);

      const targetProvider = url.searchParams.get('provider');
      let results = [];

      if (targetProvider) {
        const provider = providerRegistry.getProvider(targetProvider);
        if (!provider) return json({ error: `Provider '${targetProvider}' not found` }, 404);
        results = await provider.search(q);
      } else {
        results = await providerRegistry.searchAll(q);
      }

      return json({ success: true, count: results.length, data: results });
    }

    // 4. Episodes Route
    let m = path.match(/^\/episodes\/([^\/]+)\/?$/);
    const slugQuery = url.searchParams.get('slug') || url.searchParams.get('id') || url.searchParams.get('title');
    const epSlug = m ? m[1] : slugQuery;

    if (epSlug && (path.startsWith('/episodes') || path === '/episodes')) {
      try {
        const targetProvider = url.searchParams.get('provider');
        const fallbackTitle = url.searchParams.get('title') || '';

        // If targetProvider specified, resolve directly
        if (targetProvider) {
          const provider = providerRegistry.getProvider(targetProvider);
          if (!provider) return json({ error: `Provider '${targetProvider}' not found` }, 404);
          const resolvedSlug = await provider.resolveSlug(epSlug, fallbackTitle);
          if (!resolvedSlug) return json({ error: `Series not found on ${provider.name} for '${epSlug}'` }, 404);

          const episodes = await provider.getEpisodes(resolvedSlug);
          return json({
            success: true,
            meta: { slug: resolvedSlug, source: provider.id, audio: 'hindi' },
            episodes,
          });
        }

        // Auto-resolution across providers
        const resolved = await providerRegistry.resolveSlug(epSlug, fallbackTitle);
        if (!resolved) {
          return json({ error: `Series not found for '${epSlug}'` }, 404);
        }

        const episodeResult = await providerRegistry.getEpisodes(resolved.slug, resolved.provider);
        return json({
          success: true,
          meta: { slug: resolved.slug, source: resolved.provider, audio: 'hindi' },
          episodes: episodeResult.episodes || episodeResult,
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // 5. Watch & Stream Routes
    m = path.match(/^\/watch\/(?:toonstream|hindi|desidub)?\/?([^\/]+)\/(?:dub\/[^\-]+-)?([^\/]+)\/?$/i);
    let targetSlug = m ? m[1] : null;
    let targetEp = m ? m[2] : null;
    let routeProvider = null;

    if (path.includes('/watch/desidub/')) {
      routeProvider = 'desidub';
    } else if (path.includes('/watch/toonstream/')) {
      routeProvider = 'toonstream';
    }

    if (!targetSlug) {
      targetSlug = url.searchParams.get('slug') || url.searchParams.get('id') || url.searchParams.get('title');
      targetEp = url.searchParams.get('ep') || url.searchParams.get('episode') || '1';
    }

    if (targetSlug && targetEp && (path.startsWith('/watch') || path.startsWith('/stream'))) {
      try {
        const fallbackTitle = url.searchParams.get('title') || '';
        const anilistId = url.searchParams.get('id');
        const targetProvider = url.searchParams.get('provider') || routeProvider;

        const result = await providerRegistry.getStreamsWithFailover(targetSlug, targetEp, {
          targetProvider,
          workerOrigin: url.origin,
          title: fallbackTitle,
          anilistId,
        });

        return json(result);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: 'Endpoint not found' }, 404);
  },
};

// Export individual providers and utilities for direct imports
export {
  toonstreamProvider,
  desidubProvider,
  providerRegistry,
  healthManager,
  handleProxyRequest,
};

// Legacy exports for backward compatibility
export async function searchToonstream(query) {
  return toonstreamProvider.search(query);
}

export async function getEpisodesForSeries(seriesSlug) {
  return toonstreamProvider.getEpisodes(seriesSlug);
}

export async function extractEpisodeStreams(seriesSlug, epIdentifier, requestUrl) {
  const origin = requestUrl ? new URL(requestUrl).origin : '';
  const result = await toonstreamProvider.getStreams(seriesSlug, epIdentifier, { workerOrigin: origin });
  return result.streams;
}

export async function resolveSeriesSlug(queryOrId, fallbackTitle = '') {
  return toonstreamProvider.resolveSlug(queryOrId, fallbackTitle);
}

export async function getToonstreamBase() {
  return toonstreamProvider.getBaseUrl();
}
