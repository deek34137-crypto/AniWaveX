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
import { cleanChapterTitle, cleanHtmlText, extractChapterNumber } from '../../utils/normalize';
import { BaseProvider } from '../base';

const BASE_URL = 'https://flamecomics.me';

export class FlameComicsProvider extends BaseProvider {
  readonly id = 'flamecomics';
  readonly name = 'Flame Comics';
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
    const url = `${BASE_URL}/browse?query=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.series-card, a[href*="/series/"]');
    const results: MangaSearchResult[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const link = item.tagName === 'A' ? item : item.querySelector('a[href*="/series/"]');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/series\/([^\/?#]+)/i);
      if (!match) continue;

      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const title =
        item.querySelector('.title, h3, h4')?.text?.trim() ||
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
    const url = `${BASE_URL}/browse?order=popular&page=${page}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('a[href*="/series/"]');
    return items.slice(0, 20).map((item) => {
      const href = item.getAttribute('href') || '';
      const id = href.split('/').filter(Boolean).pop() || '';
      const title = item.querySelector('.title, h3')?.text?.trim() || id;
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
    const url = `${BASE_URL}/browse?order=latest&page=${page}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('a[href*="/series/"]');
    return items.slice(0, 20).map((item) => {
      const href = item.getAttribute('href') || '';
      const id = href.split('/').filter(Boolean).pop() || '';
      const title = item.querySelector('.title, h3')?.text?.trim() || id;
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

    const titleEl = root.querySelector('h1, .series-title');
    const title = titleEl?.text?.trim() || mangaId;

    const imgEl = root.querySelector('.series-poster img, img');
    const cover = imgEl?.getAttribute('src');

    const descEl = root.querySelector('.description, .synopsis');
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

    const chapterLinks = root.querySelectorAll('a[href*="/chapter/"], div.chapters a');
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
    const imgElements = root.querySelectorAll('div#readerarea img, div.reading-content img');

    imgElements.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && !src.includes('logo')) {
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
