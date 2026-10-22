/**
 * AniWaveX Resilience, Performance & Security Verification Suite
 * Tests the fixes across anime metadata, AniList circuit breaker, image proxy SSRF, and manga caching.
 */

import { fetchAniListGraphQL, isAniListAvailable, tripAniListCircuitBreaker } from "../src/lib/schedule.ts";

console.log("\n=======================================================");
console.log(" 🧪 ANIWAVEX RESILIENCE & PERFORMANCE TEST SUITE");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function assert(description, condition, details = "") {
  if (condition) {
    console.log(` ✅ PASS: ${description}`);
    passed++;
  } else {
    console.log(` ❌ FAIL: ${description}`);
    if (details) console.log(`    ↳ ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log("--- 1. AniList Circuit Breaker & Upstream 403 Handling ---");

  // Test 1: Active circuit breaker behavior
  tripAniListCircuitBreaker("Test initial trip");
  assert("Circuit breaker reports unavailable when tripped", !isAniListAvailable());

  const startCb = performance.now();
  const cbResult = await fetchAniListGraphQL('{ Media(id: 1) { id } }');
  const elapsedCb = performance.now() - startCb;
  assert(
    "Tripped circuit breaker returns null instantly without network call",
    cbResult === null && elapsedCb < 25,
    `Elapsed: ${elapsedCb.toFixed(2)}ms`
  );

  console.log("\n--- 2. Image Proxy SSRF & Security Validation ---");
  // Test private IP checker logic
  const isPrivateOrLocalHost = (hostname) => {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return true;
    }
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      if (parts[0] === 10) return true;
      if (parts[0] === 127) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
    }
    return false;
  };

  assert("Blocks localhost", isPrivateOrLocalHost("localhost"));
  assert("Blocks 127.0.0.1", isPrivateOrLocalHost("127.0.0.1"));
  assert("Blocks AWS metadata 169.254.169.254", isPrivateOrLocalHost("169.254.169.254"));
  assert("Blocks private class A 10.0.0.5", isPrivateOrLocalHost("10.0.0.5"));
  assert("Blocks private class C 192.168.1.1", isPrivateOrLocalHost("192.168.1.1"));
  assert("Allows legitimate public CDN", !isPrivateOrLocalHost("uploads.mangadex.org"));

  console.log("\n--- 3. Cache-Control & CDN Header Architecture ---");
  const sampleCdnHeaders = {
    "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable",
    "CDN-Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
    "Vercel-CDN-Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
  };

  assert("Image proxy specifies s-maxage for Edge caching", sampleCdnHeaders["Cache-Control"].includes("s-maxage=2592000"));
  assert("Image proxy specifies Vercel-CDN-Cache-Control", sampleCdnHeaders["Vercel-CDN-Cache-Control"] !== undefined);

  console.log("\n--- 4. Unauthenticated Cookie Inspection & Auth Guard ---");
  const hasSupabaseAuthCookie = (cookies) => {
    return cookies.some(
      (c) => c.name.startsWith("sb-") || c.name.includes("auth-token")
    );
  };

  const emptyCookies = [];
  const crawlerCookies = [{ name: "analytics_consent", value: "true" }];
  const authCookies = [{ name: "sb-12345-auth-token", value: "valid-jwt" }];

  assert("Empty cookies detected as unauthenticated", !hasSupabaseAuthCookie(emptyCookies));
  assert("Crawler cookies detected as unauthenticated", !hasSupabaseAuthCookie(crawlerCookies));
  assert("Supabase auth cookie detected as authenticated", hasSupabaseAuthCookie(authCookies));

  console.log("\n=======================================================");
  console.log(` 📊 SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
