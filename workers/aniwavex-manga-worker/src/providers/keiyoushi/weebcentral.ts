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

const BASE_URL = 'https://weebcentral.com';

export class WeebCentralProvider extends BaseProvider {
  readonly id = 'weebcentral';
  readonly name = 'WeebCentral';
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

  private parseMangaList(html: string): MangaSearchResult[] {
    const root = parse(html);
    const results: MangaSearchResult[] = [];
    const seen = new Set<string>();

    // Parse anchor tags pointing to /series/{id}/{slug}
    const links = root.querySelectorAll('a[href*="/series/"]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/series\/([0-9A-Z]+)(?:\/([^\/?#]+))?/i);
      if (!match) continue;

      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const slug = match[2] || '';
      const title =
        link.querySelector('div:not([class]):last-child')?.text?.trim() ||
        link.querySelector('.truncate')?.text?.trim() ||
        slug.replace(/-/g, ' ') ||
        'Unknown Title';

      const imgEl = link.querySelector('img');
      const cover = imgEl?.getAttribute('src') || undefined;

      results.push({
        id,
        providerId: this.id,
        title,
        cover,
        url: `${BASE_URL}/series/${id}/${slug}`,
      });
    }

    return results;
  }

  private async executeSearch(text: string, offset: number): Promise<MangaSearchResult[]> {
    const url = `${BASE_URL}/search/data?author=&text=${encodeURIComponent(
      text
    )}&sort=Best+Match&order=Ascending&official=Any&anime=Any&adult=Any&display_mode=Full+Display&limit=32&offset=${offset}`;

    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/search` },
    });

    return this.parseMangaList(html);
  }

  async search(query: string, page = 1): Promise<MangaSearchResult[]> {
    const offset = Math.max(0, (page - 1) * 32);
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Try exact query
    let results = await this.executeSearch(trimmed, offset);
    if (results.length > 0) return results;

    // 2. If query contains apostrophes (' -> ’ or vice versa), try alternate apostrophe
    if (trimmed.includes("'") || trimmed.includes("’")) {
      const altApostrophe = trimmed.includes("'")
        ? trimmed.replace(/'/g, '’')
        : trimmed.replace(/’/g, "'");
      results = await this.executeSearch(altApostrophe, offset);
      if (results.length > 0) return results;
    }

    // 3. Try removing punctuation characters (?, !, :, ;, -, ', ")
    const stripped = trimmed.replace(/['’"?!:;,\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped && stripped !== trimmed) {
      results = await this.executeSearch(stripped, offset);
      if (results.length > 0) return results;
    }

    // 4. Try the longest significant words (e.g. "Academy Survival Guide" from "The Extra's Academy Survival Guide")
    const words = trimmed.split(/\s+/).filter((w) => w.length > 2 && !/^(the|a|an|of|in|to|for|and)$/i.test(w));
    if (words.length >= 2) {
      // Try last 2-3 words (frequently contains the unique title stem)
      const subPhrase = words.slice(-3).join(' ').replace(/['’"?!:;,\-–—]/g, '');
      if (subPhrase && subPhrase !== stripped) {
        results = await this.executeSearch(subPhrase, offset);
        if (results.length > 0) return results;
      }
    }

    return [];
  }

  async getPopular(page = 1): Promise<MangaSearchResult[]> {
    const offset = Math.max(0, (page - 1) * 32);
    const url = `${BASE_URL}/search/data?sort=Popularity&order=Ascending&official=Any&anime=Any&adult=Any&display_mode=Full+Display&limit=32&offset=${offset}`;

    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/search` },
    });

    return this.parseMangaList(html);
  }

  async getLatest(page = 1): Promise<MangaSearchResult[]> {
    const offset = Math.max(0, (page - 1) * 32);
    const url = `${BASE_URL}/search/data?sort=Latest+Updates&order=Ascending&official=Any&anime=Any&adult=Any&display_mode=Full+Display&limit=32&offset=${offset}`;

    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/search` },
    });

    return this.parseMangaList(html);
  }

  async getDetails(mangaId: string): Promise<Manga> {
    const url = `${BASE_URL}/series/${mangaId}`;
    const html = await fetchText(url, { providerId: this.id });
    const root = parse(html);

    const titleEl = root.querySelector('h1');
    const title = titleEl?.text?.trim() || mangaId;

    const imgEl = root.querySelector('section[x-data] img');
    const cover = imgEl?.getAttribute('src') || undefined;

    const descEl = root.querySelector('li:has(strong:contains(Description)) p') || root.querySelector('p');
    const description = cleanHtmlText(descEl?.text);

    const authors = root
      .querySelectorAll('li:has(strong:contains(Author)) a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const genres = root
      .querySelectorAll('li:has(strong:contains(Tag),strong:contains(Type)) a')
      .map((el) => el.text.trim())
      .filter(Boolean);

    const statusText = root.querySelector('li:has(strong:contains(Status)) a')?.text;

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
    const url = `${BASE_URL}/series/${mangaId}/full-chapter-list`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/series/${mangaId}` },
    });
    const root = parse(html);

    const chapterLinks = root.querySelectorAll('div[x-data] > a, a[href*="/chapters/"]');
    const chapters: MangaChapter[] = [];
    const seen = new Set<string>();

    for (const el of chapterLinks) {
      const href = el.getAttribute('href') || '';
      const match = href.match(/\/chapters\/([0-9A-Z]+)/i);
      if (!match) continue;

      const chapterId = match[1];
      if (seen.has(chapterId)) continue;
      seen.add(chapterId);

      const nameEl = el.querySelector('span.flex > span') || el.querySelector('span');
      const rawTitle = nameEl?.text?.trim() || 'Chapter';
      const chapterNum = extractChapterNumber(rawTitle, rawTitle, href);

      const timeEl = el.querySelector('time[datetime]');
      const publishedAt = timeEl?.getAttribute('datetime') || undefined;

      const isOfficial = el.querySelector('img[src*="official"]') !== null;

      chapters.push({
        id: chapterId,
        mangaId,
        title: cleanChapterTitle(rawTitle, chapterNum),
        chapterNumber: chapterNum,
        scanlator: isOfficial ? 'Official' : undefined,
        language: 'en',
        publishedAt,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      });
    }

    return chapters.sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }

  async getPages(chapterId: string): Promise<MangaPage[]> {
    const url = `${BASE_URL}/chapters/${chapterId}/images?is_prev=False&reading_style=long_strip`;
    const html = await fetchText(url, {
      providerId: this.id,
      headers: { Referer: `${BASE_URL}/chapters/${chapterId}` },
    });
    const root = parse(html);

    const imgElements = root.querySelectorAll('section[x-data~=scroll] img, img[src*="compsci88"], img[src*="lastation"]');
    const pages: MangaPage[] = [];

    imgElements.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && !src.includes('logo')) {
        pages.push({
          index: index + 1,
          url: src,
          headers: {
            Referer: `${BASE_URL}/`,
          },
        });
      }
    });

    if (pages.length === 0) {
      // Fallback regex in case HTML attributes differ
      const regex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
      let m: RegExpExecArray | null;
      let count = 1;
      while ((m = regex.exec(html)) !== null) {
        const u = m[1];
        if (!u.includes('logo') && !u.includes('avatar') && !u.includes('icon')) {
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
        `No pages found for chapter: ${chapterId}`,
        'NOT_FOUND',
        404
      );
    }

    return pages;
  }
}
