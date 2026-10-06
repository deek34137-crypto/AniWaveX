import {
  Manga,
  MangaChapter,
  MangaPage,
  MangaProvider,
  MangaSearchResult,
  ProviderCapabilities,
  ProviderStatus,
  ProviderTier,
} from '../types';
import { AppError } from '../utils/errors';

export abstract class BaseProvider implements MangaProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly languages: string[];
  abstract readonly tier: ProviderTier;
  abstract readonly capabilities: ProviderCapabilities;
  status: ProviderStatus = 'active';

  abstract search(query: string, page?: number): Promise<MangaSearchResult[]>;
  abstract getPopular(page?: number): Promise<MangaSearchResult[]>;
  abstract getLatest(page?: number): Promise<MangaSearchResult[]>;
  abstract getDetails(mangaId: string): Promise<Manga>;
  abstract getChapters(mangaId: string, language?: string): Promise<MangaChapter[]>;
  abstract getPages(chapterId: string): Promise<MangaPage[]>;

  protected createError(
    message: string,
    code = 'PROVIDER_UNAVAILABLE',
    statusCode = 502,
    details?: any
  ): AppError {
    return new AppError(message, code, statusCode, this.id, details);
  }
}
