import { registry } from '../providers/registry';
import { MangaSearchResult } from '../types';
import { AppError } from '../utils/errors';

export async function searchWithFailover(
  query: string,
  page = 1,
  requestedProvider?: string,
  language?: string
): Promise<MangaSearchResult[]> {
  if (requestedProvider) {
    const provider = registry.get(requestedProvider);
    const start = Date.now();
    try {
      const results = await provider.search(query, page);
      registry.recordSuccess(provider.id, Date.now() - start);
      return results;
    } catch (err: any) {
      registry.recordFailure(provider.id);
      throw err;
    }
  }

  // Automatic failover through active Tier A providers
  const providers = registry
    .getByTier('A')
    .filter((p) => !language || p.languages.includes(language));

  if (providers.length === 0) {
    throw new AppError('No available providers for search', 'NO_PROVIDERS', 503);
  }

  const errors: { provider: string; error: string }[] = [];

  for (const provider of providers) {
    const start = Date.now();
    try {
      const results = await provider.search(query, page);
      if (results && results.length > 0) {
        registry.recordSuccess(provider.id, Date.now() - start);
        return results;
      }
    } catch (err: any) {
      registry.recordFailure(provider.id);
      errors.push({ provider: provider.id, error: err?.message || 'Error' });
      // Failover to next provider in sequence
      continue;
    }
  }

  // If every provider failed or returned empty
  if (errors.length === providers.length) {
    throw new AppError(
      'All providers failed during search failover',
      'PROVIDER_UNAVAILABLE',
      502,
      undefined,
      errors
    );
  }

  return [];
}
