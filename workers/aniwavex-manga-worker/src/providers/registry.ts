import { MangaProvider, ProviderHealthInfo, ProviderTier } from '../types';
import { AppError } from '../utils/errors';
import { AsuraScansProvider } from './keiyoushi/asurascans';
import { FlameComicsProvider } from './keiyoushi/flamecomics';
import { MangaDexProvider } from './keiyoushi/mangadex';
import { MangaKakalotProvider } from './keiyoushi/mangakakalot';
import { MangaReadProvider } from './keiyoushi/mangaread';
import { WeebCentralProvider } from './keiyoushi/weebcentral';
import { ComicKProvider } from './yuzono/comick';

export class ProviderRegistry {
  private providers = new Map<string, MangaProvider>();
  private health = new Map<string, ProviderHealthInfo>();

  constructor() {
    this.register(new MangaDexProvider());
    this.register(new WeebCentralProvider());
    this.register(new MangaReadProvider());
    this.register(new MangaKakalotProvider());
    this.register(new AsuraScansProvider());
    this.register(new FlameComicsProvider());
    this.register(new ComicKProvider());
  }

  register(provider: MangaProvider): void {
    this.providers.set(provider.id, provider);
    this.health.set(provider.id, {
      providerId: provider.id,
      active: provider.status === 'active',
      degraded: provider.status === 'degraded',
      successCount: 0,
      failureCount: 0,
      lastLatency: 0,
    });
  }

  getAll(): MangaProvider[] {
    return Array.from(this.providers.values());
  }

  get(id: string): MangaProvider {
    const provider = this.providers.get(id.toLowerCase());
    if (!provider) {
      throw new AppError(
        `Provider not found or not supported: '${id}'`,
        'PROVIDER_NOT_FOUND',
        404
      );
    }
    return provider;
  }

  getByTier(tier: ProviderTier): MangaProvider[] {
    return this.getAll().filter((p) => p.tier === tier && p.status !== 'disabled');
  }

  getActive(language?: string): MangaProvider[] {
    return this.getAll().filter((p) => {
      if (p.status === 'disabled') return false;
      if (language && !p.languages.includes(language)) return false;
      return true;
    });
  }

  recordSuccess(providerId: string, latencyMs: number): void {
    const stat = this.health.get(providerId);
    if (stat) {
      stat.successCount++;
      stat.lastLatency = latencyMs;
      stat.degraded = false;
      stat.active = true;
    }
  }

  recordFailure(providerId: string): void {
    const stat = this.health.get(providerId);
    if (stat) {
      stat.failureCount++;
      stat.failedAt = Date.now();
      if (stat.failureCount >= 3) {
        stat.degraded = true;
      }
    }
  }

  getHealthSummary(): ProviderHealthInfo[] {
    return Array.from(this.health.values());
  }
}

export const registry = new ProviderRegistry();
