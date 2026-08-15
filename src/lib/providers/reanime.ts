import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../../types';

/**
 * ReAnime Provider (reanime.to)
 *
 * Free anime streaming with TMDB-based and slug-based embed support.
 * Response time: ~574ms | Quality: HD | Audio: Sub + Dub
 * Placement: Drawer (user-selectable extra provider)
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const multiProvider: StreamingProviderInterface = {
  name: 'multi',
  label: 'MultiServer',
  placement: 'drawer',
  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },
  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string, anilistId?: number | null): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);
    
    const subSources: EpisodeSource[] = [];

    if (anilistId) {
      subSources.push({ url: `https://embed.filmu.in/anime/${anilistId}/1/${episode}`, quality: 'FilmU', isM3U8: false });
    } else {
      subSources.push({ url: `https://embed.filmu.in/embed/${slug}/ep-${episode}`, quality: 'FilmU (Slug Fallback)', isM3U8: false });
    }
    
    const dubSources: EpisodeSource[] = [];

    if (anilistId) {
      dubSources.push({ url: `https://embed.filmu.in/anime/${anilistId}/1/${episode}?lang=dub`, quality: 'FilmU', isM3U8: false });
    } else {
      dubSources.push({ url: `https://embed.filmu.in/embed/${slug}/ep-${episode}?lang=dub`, quality: 'FilmU (Slug Fallback)', isM3U8: false });
    }
    
    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'multi',
    };
  },
};

export default multiProvider;

