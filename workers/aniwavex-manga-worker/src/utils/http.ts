import { CONFIG } from '../config';
import { AppError } from './errors';

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  providerId?: string;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? CONFIG.DEFAULT_TIMEOUT_MS;
  const start = Date.now();

  const headers = new Headers(CONFIG.DEFAULT_HEADERS);
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - start;
    if (duration > 3000) {
      console.warn(
        `[HTTP] Slow request: ${url.slice(0, 80)} (${duration}ms, status: ${res.status})`
      );
    }

    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    if (err?.name === 'AbortError') {
      throw new AppError(
        `Request to provider timed out after ${timeoutMs}ms`,
        'PROVIDER_TIMEOUT',
        504,
        options.providerId
      );
    }

    throw new AppError(
      `Network request failed: ${err?.message || 'Unknown network error'}`,
      'PROVIDER_UNAVAILABLE',
      502,
      options.providerId
    );
  }
}

export async function fetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    throw new AppError(
      `Upstream returned HTTP ${res.status}: ${res.statusText}`,
      'PROVIDER_UNAVAILABLE',
      res.status === 404 ? 404 : 502,
      options.providerId
    );
  }

  return (await res.json()) as T;
}

export async function fetchText(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const res = await fetchWithTimeout(url, options);

  if (!res.ok) {
    throw new AppError(
      `Upstream returned HTTP ${res.status}: ${res.statusText}`,
      'PROVIDER_UNAVAILABLE',
      res.status === 404 ? 404 : 502,
      options.providerId
    );
  }

  return await res.text();
}
