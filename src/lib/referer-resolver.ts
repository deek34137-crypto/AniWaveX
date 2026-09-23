/**
 * Unified Referer Resolver for upstream streaming providers and media CDNs.
 * Shared between stream aggregator and proxy endpoints.
 */

export function resolveRefererForStream(
  targetUrl: string | URL,
  refererParam?: string | null
): string {
  const urlStr = typeof targetUrl === "string" ? targetUrl : targetUrl.toString();
  const lower = urlStr.toLowerCase();

  let hostname = "";
  try {
    hostname = (typeof targetUrl === "string" ? new URL(targetUrl) : targetUrl).hostname.toLowerCase();
  } catch {
    hostname = lower;
  }

  // MegaPlay / StreamZone cluster
  if (
    lower.includes("streamzone") ||
    lower.includes("imgnex") ||
    lower.includes("akirax.buzz") ||
    lower.includes("shiora.top") ||
    lower.includes("mikora.top") ||
    lower.includes("watching.onl") ||
    lower.includes("megaplay.buzz") ||
    lower.includes("anivideo") ||
    lower.includes("cloudbuzz") ||
    lower.includes("vaelith") ||
    lower.includes("orphiq") ||
    lower.includes("kryntal") ||
    lower.includes("sugevideo") ||
    lower.includes("sugevids") ||
    hostname.includes("megaplay.buzz")
  ) {
    return "https://megaplay.buzz/";
  }

  // KrussDomi
  if (lower.includes("krussdomi")) {
    return "https://krussdomi.com/";
  }

  // VidTube
  if (lower.includes("vidtube.site")) {
    return "https://vidtube.site/";
  }

  // BibiEmb / VibeVibe
  if (lower.includes("bibiemb.xyz") || lower.includes("vibevibe.workers.dev")) {
    return "https://bibiemb.xyz/";
  }

  // ViviBebe
  if (lower.includes("vivibebe.site")) {
    return "https://vivibebe.site/";
  }

  // AnimeApps Top
  if (lower.includes("animeapps.top")) {
    return "https://playeng.animeapps.top/";
  }

  // Anime Dunya
  if (lower.includes("anime-dunya.com")) {
    return "https://anime-dunya.com/";
  }

  // MegaCloud / Atomic4CDN
  if (lower.includes("megacloud.tv") || lower.includes("atomic4cdn.top")) {
    return "https://megacloud.tv/";
  }

  // RabbitStream
  if (lower.includes("rabbitstream.net")) {
    return "https://rabbitstream.net/";
  }

  // DokiCloud
  if (lower.includes("dokicloud.one")) {
    return "https://dokicloud.one/";
  }

  // MCloud
  if (lower.includes("mcloud.to")) {
    return "https://mcloud.to/";
  }

  // VidCloud
  if (lower.includes("vidcloud.co") || lower.includes("vidcloud.fun")) {
    return "https://vidcloud.co/";
  }

  // VidStream
  if (lower.includes("vidstream.pro")) {
    return "https://vidstream.pro/";
  }

  // If a valid caller-provided referer is present (and not generic fallback), preserve it
  if (refererParam && refererParam !== "https://flixcloud.cc/") {
    return refererParam;
  }

  return refererParam || "https://flixcloud.cc/";
}
