/**
 * Image optimization utility for delivering modern WebP formats and responsive sizes.
 * Bypasses Vercel image limits while delivering sub-second edge-cached images.
 */

export interface OptimizeImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "jpg";
}

/**
 * Transforms external image URLs into edge-optimized WebP URLs via images.weserv.nl.
 * Automatically preserves SVGs, local assets, data URIs, and already-optimized URLs.
 */
export function getOptimizedImageUrl(
  src: string | null | undefined,
  options: OptimizeImageOptions = {}
): string {
  if (!src || typeof src !== "string") return "";

  const trimmed = src.trim();

  // 1. Skip local assets, data URIs, SVGs, or already-optimized URLs
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.includes(".svg") ||
    trimmed.includes("images.weserv.nl")
  ) {
    return trimmed;
  }

  // 2. Normalize schema
  const normalizedUrl = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

  // Only proxy valid HTTP/HTTPS URLs
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    return trimmed;
  }

  const {
    width,
    height,
    quality = 85,
    format = "webp",
  } = options;

  const params = new URLSearchParams();
  params.set("url", normalizedUrl);
  if (width && width > 0) params.set("w", width.toString());
  if (height && height > 0) params.set("h", height.toString());
  params.set("q", Math.min(100, Math.max(1, quality)).toString());
  params.set("output", format);
  params.set("n", "-1"); // Do not enlarge if original is smaller than requested width

  return `https://images.weserv.nl/?${params.toString()}`;
}
