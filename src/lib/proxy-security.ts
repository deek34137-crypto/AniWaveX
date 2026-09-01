/**
 * Signed Token URLs & HMAC Verification for /api/proxy
 * Prevents open proxy relay abuse and SSRF through cryptographically signed short-lived tokens.
 */

import { createHmac } from "crypto";

const PROXY_SECRET = 
  process.env.PROXY_SECRET || 
  process.env.NEXTAUTH_SECRET || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  "aniwavex_secure_proxy_hmac_secret_2026";

const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Generate HMAC-SHA256 hex digest for a given URL and expiration timestamp
 */
export function generateProxySignature(url: string, exp: number): string {
  const payload = `${url}:${exp}`;
  return createHmac("sha256", PROXY_SECRET).update(payload).digest("hex");
}

/**
 * Get proxy base URL (Cloudflare Worker or Vercel API route)
 */
export function getProxyBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_PROXY_URL || process.env.STREAM_PROXY_URL || process.env.CLOUDFLARE_PROXY_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  return "/api/proxy";
}

/**
 * Generate a signed proxy URL
 * @param targetUrl Target stream or image URL
 * @param expiresInSeconds Duration in seconds before signature expires (default 24 hours)
 */
export function createSignedProxyUrl(
  targetUrl: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
  referer?: string
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = generateProxySignature(targetUrl, exp);
  const base = getProxyBaseUrl();

  let signedUrl = `${base}?url=${encodeURIComponent(targetUrl)}&exp=${exp}&sig=${sig}`;
  if (referer) {
    signedUrl += `&referer=${encodeURIComponent(referer)}`;
  }
  return signedUrl;
}

/**
 * Verify HMAC-SHA256 signature and expiration timestamp.
 * Includes a 7-day grace period for validly signed URLs to prevent video playback failure
 * on cached pages, client-side revalidation, or resumed video sessions.
 */
export function verifyProxySignature(
  url: string,
  expStr: string | null,
  sig: string | null,
  gracePeriodSeconds = 7 * 24 * 60 * 60 // 7 days grace window
): boolean {
  if (!url || !expStr || !sig) return false;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return false;

  const expectedSig = generateProxySignature(url, exp);
  if (expectedSig !== sig) {
    return false;
  }

  // Token is cryptographically authentic from our server.
  // Check if token has passed both its expiry timestamp and the grace period.
  const now = Math.floor(Date.now() / 1000);
  if (now > exp + gracePeriodSeconds) {
    return false;
  }

  return true;
}