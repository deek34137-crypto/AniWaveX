import {
  Manga,
  MangaChapter,
  MangaPage,
  MangaSearchResult,
  ProviderCapabilities,
  ProviderTier,
} from '../../types';
import { fetchJson } from '../../utils/http';
import { cleanHtmlText, extractChapterNumber, normalizeStatus } from '../../utils/normalize';
import { BaseProvider } from '../base';

const API_BASE = 'https://api.mangadex.org';
const COVERS_BASE = 'https://uploads.mangadex.org/covers';

export class MangaDexProvider extends BaseProvider {
  readonly id = 'mangadex';
  readonly name = 'MangaDex';
  readonly languages = ['en', 'hi', 'ja', 'ko', 'es', 'fr', 'pt-br', 'id'];
  readonly tier: ProviderTier = 'A';
  readonly capabilities: ProviderCapabilities = {
    search: true,
    popular: true,
    latest: true,
    details: true,
    chapters: true,
    pages: true,
  };

  private getCoverUrl(mangaId: string, relationships: any[]): string | undefined {
    const coverRel = relationships?.find((r) => r.type === 'cover_art');
    const fileName = coverRel?.attributes?.fileName;
    if (fileName) {
      return `${COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;
    }
    return undefined;
  }

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const limit = 20;
    const offset = Math.max(0, (page - 1) * limit);
    const url = `${API_BASE}/manga?title=${encodeURIComponent(
      query
    )}&limit=${limit}&offset=${offset}&includes[]=cover_art&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive`;

    const data = await fetchJson<any>(url, { providerId: this.id });
    const items = data?.data || [];

    return items.map((item: any): MangaSearchResult => {
      const titles = item.attributes?.title || {};
      const title = titles.en || Object.values(titles)[0] || 'Unknown Title';
      const altTitles = (item.attributes?.altTitles || [])
        .map((t: any) => Object.values(t)[0] as string)
        .filter(Boolean);

      return {
        id: item.id,
        providerId: this.id,
        title,
        altTitles,
        cover: this.getCoverUrl(item.id, item.relationships),
        url: `https://mangadex.org/title/${item.id}`,
      };
    });
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const limit = 20;
    const offset = Math.max(0, (page - 1) * limit);
    const url = `${API_BASE}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;

    const data = await fetchJson<any>(url, { providerId: this.id });
    const items = data?.data || [];

    return items.map((item: any): MangaSearchResult => {
      const titles = item.attributes?.title || {};
      const title = titles.en || Object.values(titles)[0] || 'Unknown Title';
      return {
        id: item.id,
        providerId: this.id,
        title,
        cover: this.getCoverUrl(item.id, item.relationships),
        url: `https://mangadex.org/title/${item.id}`,
      };
    });
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const limit = 20;
    const offset = Math.max(0, (page - 1) * limit);
    const url = `${API_BASE}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive`;

    const data = await fetchJson<any>(url, { providerId: this.id });
    const items = data?.data || [];

    return items.map((item: any): MangaSearchResult => {
      const titles = item.attributes?.title || {};
      const title = titles.en || Object.values(titles)[0] || 'Unknown Title';
      return {
        id: item.id,
        providerId: this.id,
        title,
        cover: this.getCoverUrl(item.id, item.relationships),
        url: `https://mangadex.org/title/${item.id}`,
      };
    });
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = `${API_BASE}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const item = data?.data;

    if (!item) {
      throw this.createError(`Manga not found: ${mangaId}`, 'NOT_FOUND', 404);
    }

    const titles = item.attributes?.title || {};
    const title = titles.en || Object.values(titles)[0] || 'Unknown Title';
    const altTitles = (item.attributes?.altTitles || [])
      .map((t: any) => Object.values(t)[0] as string)
      .filter(Boolean);

    const descObj = item.attributes?.description || {};
    const description = cleanHtmlText(descObj.en || Object.values(descObj)[0] || '');

    const authors = (item.relationships || [])
      .filter((r: any) => r.type === 'author')
      .map((r: any) => r.attributes?.name)
      .filter(Boolean);

    const artists = (item.relationships || [])
      .filter((r: any) => r.type === 'artist')
      .map((r: any) => r.attributes?.name)
      .filter(Boolean);

    const genres = (item.attributes?.tags || [])
      .map((t: any) => t.attributes?.name?.en)
      .filter(Boolean);

    return {
      id: item.id,
      providerId: this.id,
      title,
      altTitles,
      url: `https://mangadex.org/title/${item.id}`,
      cover: this.getCoverUrl(item.id, item.relationships),
      description,
      author: authors,
      artist: artists,
      genres,
      status: normalizeStatus(item.attributes?.status),
      year: item.attributes?.year || undefined,
    };
  }

  async getChapters(mangaId: string, language = 'en'): Promise<MangaChapter[]> {
    let offset = 0;
    const limit = 500;
    let total = 0;
    const allChapters: any[] = [];

    do {
      const url = `${API_BASE}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&order[chapter]=asc&translatedLanguage[]=${language}&includes[]=scanlation_group`;
      const data = await fetchJson<any>(url, { providerId: this.id });
      total = data?.total || 0;
      const items = data?.data || [];
      allChapters.push(...items);
      offset += limit;
    } while (offset < total && offset < 1500);
    return allChapters
      .filter(
        (ch: any) =>
          !ch.attributes?.externalUrl &&
          typeof ch.attributes?.pages === 'number' &&
          ch.attributes.pages > 0
      )
      .map((ch: any): MangaChapter => {
        const rawNum = ch.attributes?.chapter;
        const chapterNum = extractChapterNumber(rawNum, ch.attributes?.title);
        const scanGroup = (ch.relationships || []).find(
          (r: any) => r.type === 'scanlation_group'
        )?.attributes?.name;

        return {
          id: ch.id,
          mangaId,
          title: ch.attributes?.title || `Chapter ${rawNum || chapterNum}`,
          chapterNumber: chapterNum,
          volumeNumber: ch.attributes?.volume ? parseFloat(ch.attributes.volume) : undefined,
          scanlator: scanGroup || undefined,
          language: ch.attributes?.translatedLanguage || language,
          publishedAt: ch.attributes?.readableAt || ch.attributes?.publishAt,
          url: `https://mangadex.org/chapter/${ch.id}`,
        };
      })
      .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }

  async getPages(chapterId: string): Promise<MangaPage[]> {
    const url = `${API_BASE}/at-home/server/${chapterId}`;
    const data = await fetchJson<any>(url, { providerId: this.id });

    const baseUrl = data?.baseUrl;
    const hash = data?.chapter?.hash;
    const files = data?.chapter?.data || [];

    if (!baseUrl || !hash || files.length === 0) {
      throw this.createError(
        `No pages found for chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return files.map((fileName: string, index: number): MangaPage => ({
      index: index + 1,
      url: `${baseUrl}/data/${hash}/${fileName}`,
      headers: {
        Referer: 'https://mangadex.org/',
      },
    }));
  }
}
