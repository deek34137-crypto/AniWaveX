interface MemoryCacheEntry {
  response: Response;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_ENTRIES = 200;

export async function getCachedResponse(
  request: Request
): Promise<Response | null> {
  const url = request.url;

  // 1. Try Cloudflare native Cache API if available in environment
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const cache = (caches as any).default;
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }
  } catch {
    // Cache API not available or errored
  }

  // 2. Fallback to in-memory cache
  const entry = memoryCache.get(url);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.response.clone();
    } else {
      memoryCache.delete(url);
    }
  }

  return null;
}

export async function setCachedResponse(
  request: Request,
  response: Response,
  ttlSeconds: number,
  ctx?: ExecutionContext
): Promise<void> {
  if (ttlSeconds <= 0 || response.status !== 200) return;

  const url = request.url;

  // Add cache control headers
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  const cachedResponse = new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  // 1. Try Cloudflare Cache API
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const cache = (caches as any).default;
      const putPromise = cache.put(request, cachedResponse.clone());
      if (ctx) {
        ctx.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }
  } catch {
    // Cache API not available
  }

  // 2. Set memory cache
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(url, {
    response: cachedResponse.clone(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
