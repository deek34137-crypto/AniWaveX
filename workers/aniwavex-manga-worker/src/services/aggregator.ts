import { CONFIG } from '../config';
import { registry } from '../providers/registry';
import { MangaSearchResult } from '../types';
import { deduplicateSearchResults } from '../utils/dedupe';
import { AppError } from '../utils/errors';

export async function aggregatedSearch(
  query: string,
  page = 1,
  language?: string
): Promise<MangaSearchResult[]> {
  const providers = registry
    .getByTier('A')
    .filter((p) => !language || p.languages.includes(language))
    .slice(0, CONFIG.MAX_CONCURRENT_PROVIDERS);

  if (providers.length === 0) {
    throw new AppError(
      'No active primary providers available for aggregated search',
      'NO_PROVIDERS_AVAILABLE',
      503
    );
  }

  const results: MangaSearchResult[] = [];
  const errors: { provider: string; error: string }[] = [];

  const promises = providers.map(async (provider) => {
    const start = Date.now();
    try {
      const items = await provider.search(query, page);
      registry.recordSuccess(provider.id, Date.now() - start);
      return items;
    } catch (err: any) {
      registry.recordFailure(provider.id);
      errors.push({ provider: provider.id, error: err?.message || 'Failed' });
      return [];
    }
  });

  const settled = await Promise.all(promises);
  for (const list of settled) {
    results.push(...list);
  }

  if (results.length === 0 && errors.length === providers.length) {
    throw new AppError(
      `All upstream providers failed for query: "${query}"`,
      'AGGREGATED_SEARCH_FAILED',
      502,
      undefined,
      errors
    );
  }

  return deduplicateSearchResults(results, query);
}
