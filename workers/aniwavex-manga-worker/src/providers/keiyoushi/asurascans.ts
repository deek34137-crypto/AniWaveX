import { parse } from 'node-html-parser';
import {
  Manga,
  MangaChapter,
  MangaPage,
  MangaSearchResult,
  ProviderCapabilities,
  ProviderTier,
} from '../../types';
import { fetchText } from '../../utils/http';
import { cleanChapterTitle, cleanHtmlText, extractChapterNumber, normalizeStatus } from '../../utils/normalize';
import { BaseProvider } from '../base';

const BASE_URL = 'https://asuracomic.net';

export class AsuraScansProvider extends BaseProvider {
  readonly id = 'asurascans';
  readonly name = 'Asura Scans';
  readonly languages = ['en'];
  readonly tier: ProviderTier = 'B';
  readonly capabilities: ProviderCapabilities = {
    search: true,
    popular: true,
    latest: true,
    details: true,
    chapters: true,
    pages: true,
  };

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/series?page=${page}&name=${encodeURIComponent(query)}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.grid > div, .bsx, div.listupd div');
    const results: MangaSearchResult[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const link = item.querySelector('a[href*="/series/"]');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/series\/([^\/?#]+)/i);
      if (!match) continue;

      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const title =
        item.querySelector('.font-bold, .tt, h4')?.text?.trim() ||
        link.text.trim() ||
        id.replace(/-/g, ' ');

      const img = item.querySelector('img');
      const cover = img?.getAttribute('src');

      results.push({
        id,
        providerId: this.id,
        title,
        cover,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      });
    }

    return results;
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/series?page=${page}&order=popular`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.grid > div, .bsx');
    return items.map((item) => {
      const link = item.querySelector('a[href*="/series/"]');
      const href = link?.getAttribute('href') || '';
      const id = href.split('/').filter(Boolean).pop() || '';
      const title = item.querySelector('.font-bold, .tt, h4')?.text?.trim() || id;
      const img = item.querySelector('img');

      return {
        id,
        providerId: this.id,
        title,
        cover: img?.getAttribute('src'),
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      };
    });
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/series?page=${page}&order=update`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.grid > div, .bsx');
    return items.map((item) => {
      const link = item.querySelector('a[href*="/series/"]');
      const href = link?.getAttribute('href') || '';
      const id = href.split('/').filter(Boolean).pop() || '';
      const title = item.querySelector('.font-bold, .tt, h4')?.text?.trim() || id;
      const img = item.querySelector('img');

      return {
        id,
        providerId: this.id,
        title,
        cover: img?.getAttribute('src'),
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      };
    });
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = `${BASE_URL}/series/${mangaId}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const titleEl = root.querySelector('h1, .entry-title, .text-xl');
    const title = titleEl?.text?.trim() || mangaId;

    const imgEl = root.querySelector('img[alt*="poster"], .thumb img');
    const cover = imgEl?.getAttribute('src');

    const descEl = root.querySelector('span.font-medium.text-sm, .entry-content');
    const description = cleanHtmlText(descEl?.text);

    return {
      id: mangaId,
      providerId: this.id,
      title,
      url,
      cover,
      description,
      status: 'Ongoing',
    };
  }

  async getChapters(mangaId: string): Promise<MangaChapter[]> {
    const url = `${BASE_URL}/series/${mangaId}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const chapterLinks = root.querySelectorAll('div.pl-4 a, #chapterlist a, a[href*="/chapter/"]');
    const chapters: MangaChapter[] = [];
    const seen = new Set<string>();

    for (const link of chapterLinks) {
      const href = link.getAttribute('href') || '';
      if (!href) continue;

      const chapterId = href.split('/').filter(Boolean).pop() || '';
      if (seen.has(chapterId)) continue;
      seen.add(chapterId);

      const rawTitle = link.text.trim();
      const chapterNum = extractChapterNumber(rawTitle, rawTitle, href);

      chapters.push({
        id: chapterId,
        mangaId,
        title: cleanChapterTitle(rawTitle, chapterNum),
        chapterNumber: chapterNum,
        language: 'en',
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      });
    }

    return chapters.sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }

  async getPages(chapterId: string): Promise<MangaPage[]> {
    let url = chapterId;
    if (!url.startsWith('http')) {
      url = `${BASE_URL}/series/${chapterId}`;
    }

    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/` },
    });
    const root = parse(html);

    const images: MangaPage[] = [];
    const imgElements = root.querySelectorAll('div#readerarea img, img[alt*="chapter"]');

    imgElements.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && !src.includes('logo') && !src.includes('banner')) {
        images.push({
          index: index + 1,
          url: src,
          headers: {
            Referer: `${BASE_URL}/`,
          },
        });
      }
    });

    if (images.length === 0) {
      throw this.createError(
        `No pages found for chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return images;
  }
}
