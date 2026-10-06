import { registry } from '../providers/registry';
import { MangaChapter } from '../types';

export async function getChapters(
  providerId: string,
  mangaId: string,
  language?: string
): Promise<MangaChapter[]> {
  const provider = registry.get(providerId);
  const start = Date.now();

  try {
    const chapters = await provider.getChapters(mangaId, language);
    registry.recordSuccess(provider.id, Date.now() - start);
    return chapters;
  } catch (err) {
    registry.recordFailure(provider.id);
    throw err;
  }
}
