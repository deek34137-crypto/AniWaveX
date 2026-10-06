import { registry } from '../providers/registry';
import { MangaPage } from '../types';

export async function getPages(
  providerId: string,
  chapterId: string
): Promise<MangaPage[]> {
  const provider = registry.get(providerId);
  const start = Date.now();

  try {
    const rawPages = await provider.getPages(chapterId);
    registry.recordSuccess(provider.id, Date.now() - start);

    // Filter out dummy site logos and broken placeholder icons
    return rawPages.filter((p) => {
      const u = (p.url || '').toLowerCase();
      return (
        !u.includes('logo.png') &&
        !u.includes('logo.jpg') &&
        !u.includes('/static/img/logo') &&
        !u.includes('credits.png') &&
        !u.includes('discord_banner')
      );
    });
  } catch (err) {
    registry.recordFailure(provider.id);
    throw err;
  }
}
