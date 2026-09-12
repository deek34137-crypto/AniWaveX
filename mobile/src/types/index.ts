export interface EpisodeItem {
  id: string | number;
  title?: string;
  number: number;
}

export interface EpisodeSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface EpisodeStreamInfo {
  sources: EpisodeSource[];
  sub: EpisodeSource[];
  dub: EpisodeSource[];
  subtitles: any[];
  audioLanguage: string;
  isFallback: boolean;
  matchedTitle: string;
  matchedSlug: string;
  providerSlug: string;
}

export interface StreamingProviderInterface {
  name: string;
  label: string;
  placement: string;
  getEpisodes: (animeId: string, animeTitle?: string) => Promise<EpisodeItem[]>;
  getStreamInfo: (animeId: string, episode: number, animeTitle?: string, anilistId?: number | null) => Promise<EpisodeStreamInfo>;
}
