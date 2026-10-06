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

const BASE_URL = 'https://mangakakalot.com';

export class MangaKakalotProvider extends BaseProvider {
  readonly id = 'mangakakalot';
  readonly name = 'MangaKakalot';
  readonly languages = ['en'];
  readonly tier: ProviderTier = 'A';
  readonly capabilities: ProviderCapabilities = {
    search: true,
    popular: true,
    latest: true,
    details: true,
    chapters: true,
    pages: true,
  };

  private normalizeQuery(q: string): string {
    return q
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const slug = this.normalizeQuery(query);
    const url = `${BASE_URL}/search/story/${slug}?page=${page}`;

    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll(
      '.panel_story_list .story_item, div.list-truyen-item-wrap'
    );
    const results: MangaSearchResult[] = [];

    for (const item of items) {
      const link = item.querySelector('h3 a, .story_name a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const title = link.text.trim();
      const img = item.querySelector('img');
      const cover = img?.getAttribute('src');

      const id = href.split('/').filter(Boolean).pop() || '';

      results.push({
        id,
        providerId: this.id,
        title,
        cover,
        url: href,
      });
    }

    return results;
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/manga_list?type=topview&category=all&state=all&page=${page}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.list-truyen-item-wrap');
    return items.map((item) => {
      const link = item.querySelector('h3 a');
      const href = link?.getAttribute('href') || '';
      const title = link?.text.trim() || 'Manga';
      const img = item.querySelector('img');
      const id = href.split('/').filter(Boolean).pop() || '';

      return {
        id,
        providerId: this.id,
        title,
        cover: img?.getAttribute('src'),
        url: href,
      };
    });
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/manga_list?type=latest&category=all&state=all&page=${page}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const items = root.querySelectorAll('div.list-truyen-item-wrap');
    return items.map((item) => {
      const link = item.querySelector('h3 a');
      const href = link?.getAttribute('href') || '';
      const title = link?.text.trim() || 'Manga';
      const img = item.querySelector('img');
      const id = href.split('/').filter(Boolean).pop() || '';

      return {
        id,
        providerId: this.id,
        title,
        cover: img?.getAttribute('src'),
        url: href,
      };
    });
  }

  private resolveMangaUrl(id: string): string {
    if (id.startsWith('http')) return id;
    if (id.startsWith('manga-')) return `https://chapmanganato.to/${id}`;
    return `${BASE_URL}/manga/${id}`;
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = this.resolveMangaUrl(mangaId);
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const titleEl = root.querySelector(
      'div.manga-info-top h1, div.panel-story-info h1, h1'
    );
    const title = titleEl?.text?.trim() || mangaId;

    const imgEl = root.querySelector(
      'div.manga-info-pic img, span.info-image img, .story-info-left img'
    );
    const cover = imgEl?.getAttribute('src');

    const descEl = root.querySelector(
      'div#noidungm, div#panel-story-info-description, div.panel-story-info-description'
    );
    const description = cleanHtmlText(descEl?.text);

    const authors = root
      .querySelectorAll('li:contains(Author) a, td:contains(Author) + td a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const genres = root
      .querySelectorAll('li:contains(Genres) a, td:contains(Genres) + td a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const statusText = root.querySelector(
      'li:contains(Status), td:contains(Status) + td'
    )?.text;

    return {
      id: mangaId,
      providerId: this.id,
      title,
      url,
      cover,
      description,
      author: authors,
      genres,
      status: normalizeStatus(statusText),
    };
  }

  async getChapters(mangaId: string): Promise<MangaChapter[]> {
    const url = this.resolveMangaUrl(mangaId);
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const chapterElements = root.querySelectorAll(
      'div.chapter-list .row, ul.row-content-chapter li'
    );
    const chapters: MangaChapter[] = [];

    for (const el of chapterElements) {
      const link = el.querySelector('a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const rawTitle = link.text.trim();
      const chapterNum = extractChapterNumber(rawTitle, rawTitle, href);
      const chapterId = href.split('/').filter(Boolean).pop() || '';

      const timeEl = el.querySelector('.chapter-time, span:last-child');
      const publishedAt = timeEl?.text?.trim();

      chapters.push({
        id: chapterId,
        mangaId,
        title: cleanChapterTitle(rawTitle, chapterNum),
        chapterNumber: chapterNum,
        language: 'en',
        publishedAt,
        url: href,
      });
    }

    return chapters.sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }

  async getPages(chapterId: string): Promise<MangaPage[]> {
    let url = chapterId;
    if (!url.startsWith('http')) {
      url = `https://chapmanganato.to/${chapterId}`;
    }

    let html: string;
    try {
      html = await fetchText(url, { providerId: this.id });
    } catch {
      url = `${BASE_URL}/chapter/${chapterId}`;
      html = await fetchText(url, { providerId: this.id });
    }

    const root = parse(html);
    const imgElements = root.querySelectorAll(
      'div.container-chapter-reader img'
    );

    const pages: MangaPage[] = [];
    imgElements.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src) {
        pages.push({
          index: index + 1,
          url: src,
          headers: {
            Referer: 'https://chapmanganato.to/',
          },
        });
      }
    });

    if (pages.length === 0) {
      throw this.createError(
        `No pages found for chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return pages;
  }
}
