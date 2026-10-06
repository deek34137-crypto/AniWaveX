export type ProviderTier = 'A' | 'B' | 'C';
export type ProviderStatus = 'active' | 'degraded' | 'disabled';

export interface ProviderCapabilities {
  search: boolean;
  popular: boolean;
  latest: boolean;
  details: boolean;
  chapters: boolean;
  pages: boolean;
}

export interface MangaSearchResult {
  id: string;
  providerId: string;
  title: string;
  cover?: string;
  url?: string;
  altTitles?: string[];
  score?: number;
}

export interface Manga {
  id: string;
  providerId: string;
  title: string;
  altTitles?: string[];
  url?: string;
  cover?: string;
  description?: string;
  author?: string[];
  artist?: string[];
  genres?: string[];
  status?: string;
  year?: number;
  language?: string;
}

export interface MangaChapter {
  id: string;
  mangaId: string;
  title?: string;
  chapterNumber?: number;
  volumeNumber?: number;
  scanlator?: string;
  language?: string;
  publishedAt?: string;
  url?: string;
}

export interface MangaPage {
  index: number;
  url: string;
  width?: number;
  height?: number;
  headers?: Record<string, string>;
}

export interface MangaProvider {
  readonly id: string;
  readonly name: string;
  readonly languages: string[];
  readonly tier: ProviderTier;
  readonly capabilities: ProviderCapabilities;
  status: ProviderStatus;

  search(query: string, page?: number): Promise<MangaSearchResult[]>;
  getPopular(page?: number): Promise<MangaSearchResult[]>;
  getLatest(page?: number): Promise<MangaSearchResult[]>;
  getDetails(mangaId: string): Promise<Manga>;
  getChapters(mangaId: string, language?: string): Promise<MangaChapter[]>;
  getPages(chapterId: string): Promise<MangaPage[]>;
}

export interface ProviderHealthInfo {
  providerId: string;
  active: boolean;
  degraded: boolean;
  failedAt?: number;
  successCount: number;
  failureCount: number;
  lastLatency: number;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  provider?: string;
  details?: any;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
