/**
 * Manga Models and Scraper Types for AniWaveX
 */

export interface MangaItem {
  id: string;
  slug: string;
  title: string;
  romajiTitle?: string;
  nativeTitle?: string;
  posterImage: string;
  bannerImage?: string;
  description?: string;
  status: 'Ongoing' | 'Completed' | 'Hiatus' | 'Unknown';
  type: 'manga' | 'manhwa' | 'manhua' | 'comic';
  rating: string;
  genres: string[];
  totalChapters?: number;
  latestChapter?: string;
  source: string;
}

export interface MangaChapter {
  id: string;
  chapterNumber: number;
  title: string;
  releaseDate?: string;
  updatedAt?: string;
  scanlator?: string;
  source: string;
}

export interface MangaChapterPages {
  chapterId: string;
  chapterNumber: number;
  title: string;
  pages: {
    pageNumber: number;
    imageUrl: string;
    imageUrlSaver?: string;
    referer?: string;
  }[];
}
