import { registry } from '../providers/registry';
import { Manga } from '../types';

export async function getMangaDetails(
  providerId: string,
  mangaId: string
): Promise<Manga> {
  const provider = registry.get(providerId);
  const start = Date.now();

  try {
    const details = await provider.getDetails(mangaId);
    registry.recordSuccess(provider.id, Date.now() - start);
    return details;
  } catch (err) {
    registry.recordFailure(provider.id);
    throw err;
  }
}
