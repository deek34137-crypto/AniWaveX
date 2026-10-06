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

const API_BASE = 'https://api.comick.fun';
const IMAGE_BASE = 'https://meo.comick.pictures';

export class ComicKProvider extends BaseProvider {
  readonly id = 'comick';
  readonly name = 'ComicK';
  readonly languages = ['en', 'es', 'fr', 'pt-br', 'id'];
  readonly tier: ProviderTier = 'C';
  status: any = 'disabled';
  readonly capabilities: ProviderCapabilities = {
    search: true,
    popular: true,
    latest: true,
    details: true,
    chapters: true,
    pages: true,
  };

  private getCoverUrl(mdCovers?: any[]): string | undefined {
    if (mdCovers && mdCovers.length > 0 && mdCovers[0].bkey) {
      return `${IMAGE_BASE}/${mdCovers[0].bkey}`;
    }
    return undefined;
  }

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const url = `${API_BASE}/v1.0/search?q=${encodeURIComponent(
      query
    )}&type=comic&page=${page}&limit=20`;

    const data = await fetchJson<any[]>(url, { providerId: this.id });
    const items = Array.isArray(data) ? data : (data as any)?.data || [];

    return items.map((item: any): MangaSearchResult => {
      const cover = item.md_covers?.[0]?.bkey
        ? `${IMAGE_BASE}/${item.md_covers[0].bkey}`
        : item.cover_url;

      return {
        id: item.hid || item.slug,
        providerId: this.id,
        title: item.title || 'Unknown Title',
        altTitles: item.md_titles?.map((t: any) => t.title) || [],
        cover,
        url: `https://comick.io/comic/${item.slug}`,
      };
    });
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const url = `${API_BASE}/top?type=trending&comic_types=manga&comic_types=manhwa&comic_types=manhua`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const items = data?.rank || (Array.isArray(data) ? data : []);

    return items.map((item: any): MangaSearchResult => {
      const cover = item.md_covers?.[0]?.bkey
        ? `${IMAGE_BASE}/${item.md_covers[0].bkey}`
        : item.cover_url;

      return {
        id: item.hid || item.slug,
        providerId: this.id,
        title: item.title || 'Unknown Title',
        cover,
        url: `https://comick.io/comic/${item.slug}`,
      };
    });
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const url = `${API_BASE}/chapter?lang=en&page=${page}&order=new`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const items = Array.isArray(data) ? data : (data as any)?.data || [];

    return items.map((item: any): MangaSearchResult => {
      const mdComic = item.md_comics;
      const cover = mdComic?.md_covers?.[0]?.bkey
        ? `${IMAGE_BASE}/${mdComic.md_covers[0].bkey}`
        : undefined;

      return {
        id: mdComic?.hid || mdComic?.slug || item.hid,
        providerId: this.id,
        title: mdComic?.title || 'Unknown Title',
        cover,
        url: mdComic?.slug ? `https://comick.io/comic/${mdComic.slug}` : undefined,
      };
    });
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = `${API_BASE}/comic/${mangaId}`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const comic = data?.comic;

    if (!comic) {
      throw this.createError(`Manga not found: ${mangaId}`, 'NOT_FOUND', 404);
    }

    const cover = this.getCoverUrl(comic.md_covers);
    const authors = (data.authors || []).map((a: any) => a.name).filter(Boolean);
    const artists = (data.artists || []).map((a: any) => a.name).filter(Boolean);
    const genres = (comic.md_comic_md_genres || [])
      .map((g: any) => g.md_genres?.name)
      .filter(Boolean);

    const statusMap: Record<number, string> = {
      1: 'Ongoing',
      2: 'Completed',
      3: 'Cancelled',
      4: 'Hiatus',
    };

    return {
      id: comic.hid || mangaId,
      providerId: this.id,
      title: comic.title || 'Unknown Title',
      altTitles: (comic.md_titles || []).map((t: any) => t.title).filter(Boolean),
      url: `https://comick.io/comic/${comic.slug}`,
      cover,
      description: cleanHtmlText(comic.desc),
      author: authors,
      artist: artists,
      genres,
      status: statusMap[comic.status] || normalizeStatus(comic.status),
      year: comic.year || undefined,
    };
  }

  async getChapters(mangaId: string, language = 'en'): Promise<MangaChapter[]> {
    const url = `${API_BASE}/comic/${mangaId}/chapters?lang=${language}&limit=1000&page=1`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const chapters = data?.chapters || (Array.isArray(data) ? data : []);

    return chapters
      .map((ch: any): MangaChapter => {
        const rawNum = ch.chap;
        const chapterNum = extractChapterNumber(rawNum, ch.title);
        const scanlator = ch.group_name || ch.md_groups?.[0]?.title;

        return {
          id: ch.hid,
          mangaId,
          title: ch.title || `Chapter ${rawNum || chapterNum}`,
          chapterNumber: chapterNum,
          volumeNumber: ch.vol ? parseFloat(ch.vol) : undefined,
          scanlator: scanlator || undefined,
          language: ch.lang || language,
          publishedAt: ch.updated_at || ch.created_at,
          url: `https://comick.io/comic/${mangaId}/${ch.hid}`,
        };
      })
      .sort((a: MangaChapter, b: MangaChapter) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }

  async getPages(chapterId: string): Promise<MangaPage[]> {
    const url = `${API_BASE}/chapter/${chapterId}`;
    const data = await fetchJson<any>(url, { providerId: this.id });
    const chapterData = data?.chapter;
    const images = chapterData?.images || [];

    if (!images || images.length === 0) {
      throw this.createError(
        `No pages found for chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return images.map((img: any, index: number): MangaPage => {
      let pageUrl = img.url;
      if (!pageUrl && img.bkey) {
        pageUrl = `${IMAGE_BASE}/${img.bkey}`;
      }

      return {
        index: index + 1,
        url: pageUrl,
        width: img.w,
        height: img.h,
        headers: {
          Referer: 'https://comick.io/',
        },
      };
    });
  }
}
