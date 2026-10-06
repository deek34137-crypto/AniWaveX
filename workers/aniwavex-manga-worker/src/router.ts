import { CONFIG } from './config';
import { registry } from './providers/registry';
import { aggregatedSearch } from './services/aggregator';
import { getCachedResponse, setCachedResponse } from './services/cache';
import { getChapters } from './services/chapters';
import { getMangaDetails } from './services/manga';
import { getPages } from './services/pages';
import { searchWithFailover } from './services/search';
import { AppError, formatErrorResponse } from './utils/errors';
import { fetchWithTimeout } from './utils/http';

export function handleCors(request: Request): Response {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function jsonResponse(data: any, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }
  return false;
}

export async function routeRequest(
  request: Request,
  ctx?: ExecutionContext
): Promise<Response> {
  const origin = request.headers.get('Origin') || '*';
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return handleCors(request);
  }

  // 1. Health check
  if (pathname === '/health' && method === 'GET') {
    return jsonResponse(
      {
        ok: true,
        service: CONFIG.SERVICE_NAME,
        version: CONFIG.VERSION,
      },
      200,
      origin
    );
  }

  // 2. Provider registry
  if (pathname === '/api/providers' && method === 'GET') {
    const providers = registry.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      languages: p.languages,
      tier: p.tier,
      status: p.status,
      capabilities: p.capabilities,
    }));
    const health = registry.getHealthSummary();
    return jsonResponse({ ok: true, data: providers, meta: { health } }, 200, origin);
  }

  // 3. Check Cache API for GET endpoints
  if (method === 'GET' && !pathname.startsWith('/api/image')) {
    const cached = await getCachedResponse(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(cached.body, {
        status: cached.status,
        headers,
      });
    }
  }

  try {
    let response: Response;

    // 4. Aggregated search GET /api/search?q=...&page=1
    if (pathname === '/api/search' && method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const language = url.searchParams.get('language') || undefined;

      if (!q.trim()) {
        throw new AppError('Query parameter "q" is required', 'MISSING_PARAM', 400);
      }

      const data = await aggregatedSearch(q.trim(), page, language);
      response = jsonResponse({ ok: true, data, meta: { query: q, page } }, 200, origin);
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.SEARCH, ctx);
      return response;
    }

    // 5. Manga search GET /api/manga/search?q=...&page=1&provider=...
    if (pathname === '/api/manga/search' && method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const provider = url.searchParams.get('provider') || undefined;
      const language = url.searchParams.get('language') || undefined;

      if (!q.trim()) {
        throw new AppError('Query parameter "q" is required', 'MISSING_PARAM', 400);
      }

      const data = await searchWithFailover(q.trim(), page, provider, language);
      response = jsonResponse({ ok: true, data, meta: { query: q, page, provider } }, 200, origin);
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.SEARCH, ctx);
      return response;
    }

    // 6. Manga popular GET /api/manga/popular?page=1&provider=...
    if (pathname === '/api/manga/popular' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const providerId = url.searchParams.get('provider') || 'mangadex';
      const provider = registry.get(providerId);

      const data = await provider.getPopular(page);
      response = jsonResponse({ ok: true, data, meta: { page, provider: providerId } }, 200, origin);
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.POPULAR, ctx);
      return response;
    }

    // 7. Manga latest GET /api/manga/latest?page=1&provider=...
    if (pathname === '/api/manga/latest' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const providerId = url.searchParams.get('provider') || 'mangadex';
      const provider = registry.get(providerId);

      const data = await provider.getLatest(page);
      response = jsonResponse({ ok: true, data, meta: { page, provider: providerId } }, 200, origin);
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.LATEST, ctx);
      return response;
    }

    // 8. Chapter Pages GET /api/chapter/:provider/:id/pages
    const chapterPagesMatch = pathname.match(/^\/api\/chapter\/([^\/]+)\/(.+)\/pages$/);
    if (chapterPagesMatch && method === 'GET') {
      const [, providerId, chapterId] = chapterPagesMatch;
      const decodedChapterId = decodeURIComponent(chapterId);

      const data = await getPages(providerId, decodedChapterId);
      response = jsonResponse(
        { ok: true, data, meta: { provider: providerId, chapterId: decodedChapterId } },
        200,
        origin
      );
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.PAGES, ctx);
      return response;
    }

    // 9. Manga Chapters GET /api/manga/:provider/:id/chapters
    const mangaChaptersMatch = pathname.match(/^\/api\/manga\/([^\/]+)\/([^\/]+)\/chapters$/);
    if (mangaChaptersMatch && method === 'GET') {
      const [, providerId, mangaId] = mangaChaptersMatch;
      const language = url.searchParams.get('language') || 'en';
      const decodedMangaId = decodeURIComponent(mangaId);

      const data = await getChapters(providerId, decodedMangaId, language);
      response = jsonResponse(
        { ok: true, data, meta: { provider: providerId, mangaId: decodedMangaId, language } },
        200,
        origin
      );
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.CHAPTERS, ctx);
      return response;
    }

    // 10. Manga Details GET /api/manga/:provider/:id
    const mangaDetailsMatch = pathname.match(/^\/api\/manga\/([^\/]+)\/([^\/]+)$/);
    if (mangaDetailsMatch && method === 'GET') {
      const [, providerId, mangaId] = mangaDetailsMatch;
      const decodedMangaId = decodeURIComponent(mangaId);

      const data = await getMangaDetails(providerId, decodedMangaId);
      response = jsonResponse(
        { ok: true, data, meta: { provider: providerId, mangaId: decodedMangaId } },
        200,
        origin
      );
      await setCachedResponse(request, response, CONFIG.CACHE_TTL.DETAILS, ctx);
      return response;
    }

    // 11. Image Proxy GET/HEAD /api/image/:provider/*
    if (pathname.startsWith('/api/image/') && (method === 'GET' || method === 'HEAD')) {
      const targetUrlStr = url.searchParams.get('url');
      if (!targetUrlStr) {
        throw new AppError('Query parameter "url" is required', 'MISSING_PARAM', 400);
      }

      let parsedTarget: URL;
      try {
        parsedTarget = new URL(targetUrlStr);
      } catch {
        throw new AppError('Invalid image URL', 'INVALID_PARAM', 400);
      }

      if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
        throw new AppError('Invalid URL protocol', 'INVALID_PARAM', 400);
      }

      const host = parsedTarget.hostname.toLowerCase();
      if (isPrivateIp(host)) {
        throw new AppError('Private IP addresses not allowed', 'SSRF_BLOCKED', 403);
      }

      const isAllowed = CONFIG.ALLOWED_IMAGE_HOSTS.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
      );
      if (!isAllowed) {
        throw new AppError('Host not permitted in image proxy', 'HOST_NOT_ALLOWED', 403);
      }

      const referer =
        url.searchParams.get('referer') || `${parsedTarget.protocol}//${parsedTarget.hostname}/`;

      const upstreamRes = await fetch(parsedTarget.toString(), {
        headers: {
          'User-Agent': CONFIG.DEFAULT_HEADERS['User-Agent'],
          Referer: referer,
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!upstreamRes.ok) {
        throw new AppError(
          `Upstream image error: ${upstreamRes.statusText}`,
          'IMAGE_FETCH_FAILED',
          upstreamRes.status
        );
      }

      const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
      const body = await upstreamRes.arrayBuffer();

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': origin,
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Backward Compatibility Endpoints for existing AniWaveX client
    // ─────────────────────────────────────────────────────────────

    // POST /api/search with { query: string, provider?: string }
    if (pathname === '/api/search' && method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      const query = (body?.query || '').trim();
      const providerId = body?.provider;

      if (!query) {
        return jsonResponse({ results: [] }, 200, origin);
      }

      let results;
      if (providerId) {
        results = await searchWithFailover(query, 1, providerId);
      } else {
        results = await aggregatedSearch(query, 1);
      }

      const formatted = results.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url || '',
        coverImage: r.cover,
        provider: r.providerId,
        altTitles: r.altTitles,
        score: r.score,
      }));

      return jsonResponse({ results: formatted }, 200, origin);
    }

    // POST /api/chapters with { provider: string, id: string, url?: string }
    if (pathname === '/api/chapters' && method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      const providerId = body?.provider || 'mangadex';
      const mangaId = body?.id;

      if (!mangaId) {
        throw new AppError('Field "id" is required', 'MISSING_PARAM', 400);
      }

      const chapters = await getChapters(providerId, mangaId, 'en');
      const formatted = chapters.map((c) => ({
        id: c.id,
        number: String(c.chapterNumber ?? 0),
        numberValue: c.chapterNumber ?? 0,
        title: c.title || `Chapter ${c.chapterNumber}`,
        url: c.url || '',
        language: c.language || 'en',
        provider: providerId,
      }));

      return jsonResponse(
        { chapters: formatted, providerName: providerId },
        200,
        origin
      );
    }

    // POST /api/pages with { provider: string, chapterId: string, url?: string }
    if (pathname === '/api/pages' && method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as any;
      const providerId = body?.provider || 'mangadex';
      const chapterId = body?.chapterId || body?.id;

      if (!chapterId) {
        throw new AppError('Field "chapterId" is required', 'MISSING_PARAM', 400);
      }

      const pages = await getPages(providerId, chapterId);
      const formatted = pages.map((p) => ({
        index: p.index,
        url: p.url,
        headers: p.headers || {},
        provider: providerId,
      }));

      return jsonResponse({ pages: formatted }, 200, origin);
    }

    // GET /api/proxy/html?provider=...&url=...
    if (pathname === '/api/proxy/html' && method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        throw new AppError('Query parameter "url" is required', 'MISSING_PARAM', 400);
      }
      const parsed = new URL(targetUrl);
      if (isPrivateIp(parsed.hostname)) {
        throw new AppError('Private IP addresses not allowed', 'SSRF_BLOCKED', 403);
      }
      const upstream = await fetchWithTimeout(targetUrl);
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': origin,
        },
      });
    }

    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint not found: ${method} ${pathname}`,
        },
      },
      404,
      origin
    );
  } catch (err: unknown) {
    const { response, status } = formatErrorResponse(err);
    return jsonResponse(response, status, origin);
  }
}
