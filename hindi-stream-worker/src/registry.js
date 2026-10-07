/**
 * Central Provider Registry & Intelligent Aggregator
 */
import { toonstreamProvider } from './providers/toonstream.js';
import { desidubProvider } from './providers/desidub.js';
import { healthManager } from './health.js';
import { memoryCache } from './utils/cache.js';

export class ProviderRegistry {
  constructor() {
    this.providers = [toonstreamProvider, desidubProvider];
  }

  getProviders() {
    return this.providers.filter((p) => p.enabled);
  }

  getProvider(id) {
    if (!id) return null;
    return this.providers.find((p) => p.id.toLowerCase() === id.toLowerCase() && p.enabled) || null;
  }

  /**
   * Search across all available healthy providers
   */
  async searchAll(query) {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    const healthyProviders = this.getProviders().filter((p) => healthManager.isAvailable(p.id));
    const searchPromises = healthyProviders.map(async (provider) => {
      const start = Date.now();
      try {
        const results = await provider.search(query);
        healthManager.recordSuccess(provider.id, Date.now() - start);
        return results;
      } catch (err) {
        healthManager.recordFailure(provider.id, err);
        return [];
      }
    });

    const settled = await Promise.allSettled(searchPromises);
    const combined = [];
    const seen = new Set();

    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          const key = `${item.provider}:${item.slug}`;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        }
      }
    }

    memoryCache.set(cacheKey, combined, 120000); // 2 min
    return combined;
  }

  /**
   * Resolve series slug across providers
   */
  async resolveSlug(queryOrId, fallbackTitle = '', targetProvider = null) {
    if (targetProvider) {
      const p = this.getProvider(targetProvider);
      if (p) {
        const slug = await p.resolveSlug(queryOrId, fallbackTitle);
        return slug ? { provider: p.id, slug } : null;
      }
    }

    const sorted = [...this.getProviders()].sort((a, b) => {
      const availA = healthManager.isAvailable(a.id) ? 1 : 0;
      const availB = healthManager.isAvailable(b.id) ? 1 : 0;
      if (availA !== availB) return availB - availA;
      return b.priority - a.priority;
    });

    for (const provider of sorted) {
      const start = Date.now();
      try {
        const slug = await provider.resolveSlug(queryOrId, fallbackTitle);
        if (slug) {
          healthManager.recordSuccess(provider.id, Date.now() - start);
          return { provider: provider.id, slug };
        }
      } catch (err) {
        healthManager.recordFailure(provider.id, err);
      }
    }

    return null;
  }

  /**
   * Get episode list for a series
   */
  async getEpisodes(seriesSlug, targetProvider = null) {
    if (targetProvider) {
      const p = this.getProvider(targetProvider);
      if (p) return await p.getEpisodes(seriesSlug);
    }

    const sorted = [...this.getProviders()].sort((a, b) => b.priority - a.priority);
    for (const p of sorted) {
      try {
        const episodes = await p.getEpisodes(seriesSlug);
        if (episodes && episodes.length > 0) {
          return { provider: p.id, episodes };
        }
      } catch {}
    }

    throw new Error(`Episodes not found for series slug '${seriesSlug}'`);
  }

  /**
   * Aggregates and ranks stream sources across providers with failover
   */
  async getStreamsWithFailover(queryOrSlug, epIdentifier, options = {}) {
    const { targetProvider, workerOrigin, title, anilistId } = options;

    // Direct provider requested
    if (targetProvider) {
      const p = this.getProvider(targetProvider);
      if (p) {
        const resolvedSlug = await p.resolveSlug(queryOrSlug, title);
        if (!resolvedSlug) throw new Error(`Could not resolve slug on ${p.name}`);
        const result = await p.getStreams(resolvedSlug, epIdentifier, { workerOrigin });
        const streams = result.streams || [];
        const primaryHls = streams.find((s) => s.isM3U8);
        return {
          success: true,
          provider: p.id,
          stream_url: primaryHls?.url || streams[0]?.url,
          streams,
          stream: {
            sources: streams,
            defaultAudio: 'hin',
          },
          subtitles: result.subtitles || [],
        };
      }
    }

    // Speculative tiered resolution
    const candidates = [...this.getProviders()].sort((a, b) => {
      const availA = healthManager.isAvailable(a.id) ? 1 : 0;
      const availB = healthManager.isAvailable(b.id) ? 1 : 0;
      if (availA !== availB) return availB - availA;
      return b.priority - a.priority;
    });

    const allStreams = [];
    const allSubtitles = [];
    let successfulProvider = null;

    for (const provider of candidates) {
      const start = Date.now();
      try {
        const resolvedSlug = await provider.resolveSlug(queryOrSlug, title);
        if (!resolvedSlug) continue;

        const result = await provider.getStreams(resolvedSlug, epIdentifier, { workerOrigin });
        if (result && Array.isArray(result.streams) && result.streams.length > 0) {
          healthManager.recordSuccess(provider.id, Date.now() - start);
          successfulProvider = successfulProvider || provider.id;

          allStreams.push(...result.streams);
          if (Array.isArray(result.subtitles)) {
            for (const sub of result.subtitles) {
              if (sub?.url && !allSubtitles.some((s) => s.url === sub.url)) {
                allSubtitles.push(sub);
              }
            }
          }

          // If we found direct HLS streams from our top provider, break early to minimize latency
          if (result.streams.some((s) => s.isM3U8)) {
            break;
          }
        }
      } catch (err) {
        healthManager.recordFailure(provider.id, err);
        // Continue to next provider for failover!
      }
    }

    if (allStreams.length === 0) {
      throw new Error(`No playable stream sources found for episode ${epIdentifier}`);
    }

    // Rank streams: Direct HLS > Proxied HLS > Multi-audio > Embeds
    allStreams.sort((a, b) => {
      if (a.isM3U8 && !b.isM3U8) return -1;
      if (!a.isM3U8 && b.isM3U8) return 1;
      return 0;
    });

    const primaryHls = allStreams.find((s) => s.isM3U8);

    return {
      success: true,
      provider: successfulProvider || 'multi',
      stream_url: primaryHls?.url || allStreams[0].url,
      streams: allStreams,
      stream: {
        sources: allStreams,
        defaultAudio: 'hin',
      },
      subtitles: allSubtitles,
    };
  }
}

export const providerRegistry = new ProviderRegistry();
