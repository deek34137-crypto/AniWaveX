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

const BASE_URL = 'https://www.mangaread.org';

export class MangaReadProvider extends BaseProvider {
  readonly id = 'mangaread';
  readonly name = 'MangaRead';
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

  private parseMangaItems(html: string): MangaSearchResult[] {
    const root = parse(html);
    const results: MangaSearchResult[] = [];
    const seen = new Set<string>();

    // Search items or grid items
    const items = root.querySelectorAll(
      '.c-tabs-item__content, .page-item-detail, .badge-pos-1'
    );

    for (const item of items) {
      const link = item.querySelector('h3 a, h4 a, .post-title a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/manga\/([^\/?#]+)/i);
      if (!match) continue;

      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const title = link.text.trim();
      const img = item.querySelector('img');
      const cover = img?.getAttribute('data-src') || img?.getAttribute('src') || undefined;

      results.push({
        id,
        providerId: this.id,
        title,
        cover: cover?.trim(),
        url: href,
      });
    }

    return results;
  }

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga${page > 1 ? `&paged=${page}` : ''}`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: {
        Referer: `${BASE_URL}/`,
      },
    });

    const results = this.parseMangaItems(html);
    return results;
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/manga/${page > 1 ? `page/${page}/` : ''}?m_orderby=views`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/` },
    });
    return this.parseMangaItems(html);
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/manga/${page > 1 ? `page/${page}/` : ''}?m_orderby=latest`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/` },
    });
    return this.parseMangaItems(html);
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = mangaId.startsWith('http') ? mangaId : `${BASE_URL}/manga/${mangaId}/`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/` },
    });
    const root = parse(html);

    const titleEl = root.querySelector('.post-title h1, h1');
    const title = titleEl?.text?.trim() || mangaId;

    const imgEl = root.querySelector('.summary_image img, .tab-summary img');
    const cover = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || undefined;

    const descEl = root.querySelector('.description-summary, .summary__content');
    const description = cleanHtmlText(descEl?.text);

    const authors = root
      .querySelectorAll('.author-content a, .artist-content a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const genres = root
      .querySelectorAll('.genres-content a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const statusText = root.querySelector('.post-status .summary-content')?.text?.trim();

    return {
      id: mangaId,
      providerId: this.id,
      title,
      url,
      cover: cover?.trim(),
      description,
      author: authors,
      genres,
      status: normalizeStatus(statusText),
    };
  }

  async getChapters(mangaId: string): Promise<MangaChapter[]> {
    const cleanId = mangaId.replace(BASE_URL, '').replace(/^\/manga\//, '').replace(/\/.*$/, '');
    let html = '';

    // 1. Try AJAX endpoint first for complete chapter list
    try {
      const ajaxUrl = `${BASE_URL}/manga/${cleanId}/ajax/chapters/`;
      html = await fetchText(ajaxUrl, {
        providerId: this.id,
        headers: {
          Referer: `${BASE_URL}/manga/${cleanId}/`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
    } catch {
      // 2. Fallback to main manga page HTML
      const mainUrl = `${BASE_URL}/manga/${cleanId}/`;
      html = await fetchText(mainUrl, {
        providerId: this.id,
        headers: { Referer: `${BASE_URL}/` },
      });
    }

    const root = parse(html);
    const chapterEls = root.querySelectorAll('li.wp-manga-chapter');
    const chapters: MangaChapter[] = [];
    const seen = new Set<string>();

    for (const el of chapterEls) {
      const link = el.querySelector('a');
      if (!link) continue;

      const href = link.getAttribute('href') || '';
      if (!href || seen.has(href)) continue;
      seen.add(href);

      const rawTitle = link.text.trim();
      const chapterNum = extractChapterNumber(rawTitle, rawTitle, href);

      // Chapter ID: unique chapter slug
      const chapterSlug = href.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');

      const timeEl = el.querySelector('.chapter-release-date');
      const publishedAt = timeEl?.text?.trim() || undefined;

      chapters.push({
        id: chapterSlug,
        mangaId: cleanId,
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
    const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}/${chapterId}/`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: {
        Referer: `${BASE_URL}/`,
      },
    });

    const root = parse(html);
    const imgElements = root.querySelectorAll('img.wp-manga-chapter-img, .page-break img');
    const pages: MangaPage[] = [];

    imgElements.forEach((img, index) => {
      let rawSrc = img.getAttribute('data-src') || img.getAttribute('src');
      if (rawSrc) {
        // Strip whitespace and linebreaks common in Madara templates
        const cleanSrc = rawSrc.replace(/[\r\n\t]/g, '').trim();
        if (cleanSrc && !cleanSrc.includes('logo') && !cleanSrc.includes('placeholder')) {
          pages.push({
            index: index + 1,
            url: cleanSrc,
            headers: {
              Referer: `${BASE_URL}/`,
            },
          });
        }
      }
    });

    if (pages.length === 0) {
      // Fallback regex matching in raw HTML
      const regex = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*class=["'][^"']*wp-manga-chapter-img/gi;
      let m: RegExpExecArray | null;
      let count = 1;
      while ((m = regex.exec(html)) !== null) {
        const u = m[1].replace(/[\r\n\t]/g, '').trim();
        if (u && !u.includes('logo')) {
          pages.push({
            index: count++,
            url: u,
            headers: {
              Referer: `${BASE_URL}/`,
            },
          });
        }
      }
    }

    if (pages.length === 0) {
      throw this.createError(
        `No pages found for MangaRead chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return pages;
  }
}
