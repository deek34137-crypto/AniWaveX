import crypto from "crypto";

/**
 * Generate a cryptographically secure random string for PKCE code_verifier (length: 128)
 */
export function generateCodeVerifier(length = 128): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += possible[bytes[i] % possible.length];
  }
  return result;
}

/**
 * Generate SHA-256 base64url-encoded code_challenge from code_verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate cryptographically secure random state parameter for OAuth CSRF protection
 */
export function generateOAuthState(provider: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  return `${provider}_${nonce}_${Date.now()}`;
}

/**
 * Validate received state against expected state
 */
export function isValidOAuthState(receivedState: string, expectedState: string, maxAgeMs = 15 * 60 * 1000): boolean {
  if (!receivedState || !expectedState) return false;
  if (receivedState !== expectedState) return false;

  const parts = receivedState.split("_");
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(timestamp)) {
      if (Date.now() - timestamp > maxAgeMs) {
        return false; // Expired state
      }
    }
  }

  return true;
}
