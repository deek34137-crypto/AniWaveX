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

const DEFAULT_EXPIRY_SECONDS = 30 * 60; // 30 minutes

/**
 * Generate HMAC-SHA256 hex digest for a given URL and expiration timestamp
 */
export function generateProxySignature(url: string, exp: number): string {
  const payload = `${url}:${exp}`;
  return createHmac("sha256", PROXY_SECRET).update(payload).digest("hex");
}

/**
 * Generate a signed proxy URL
 * @param targetUrl Target stream or image URL
 * @param expiresInSeconds Duration in seconds before signature expires (default 30 mins)
 */
export function createSignedProxyUrl(
  targetUrl: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
  referer?: string
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = generateProxySignature(targetUrl, exp);

  let signedUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}&exp=${exp}&sig=${sig}`;
  if (referer) {
    signedUrl += `&referer=${encodeURIComponent(referer)}`;
  }
  return signedUrl;
}

/**
 * Verify HMAC-SHA256 signature and expiration timestamp
 */
export function verifyProxySignature(
  url: string,
  expStr: string | null,
  sig: string | null
): boolean {
  if (!url || !expStr || !sig) return false;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return false;

  // Check if token has expired
  const now = Math.floor(Date.now() / 1000);
  if (now > exp) {
    return false;
  }

  const expectedSig = generateProxySignature(url, exp);
  return expectedSig === sig;
}