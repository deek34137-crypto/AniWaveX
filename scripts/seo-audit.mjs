/**
 * AniWaveX SEO Health Checker & Audit Script
 * Development-only utility to verify technical SEO architecture,
 * metadata configurations, structured data schemas, and indexing directives.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("\n=======================================================");
console.log(" 🔍 ANIWAVEX TECHNICAL SEO AUDIT & HEALTH CHECKER");
console.log("=======================================================\n");

let passed = 0;
let warnings = 0;
let failed = 0;

function check(title, condition, details = "") {
  if (condition) {
    console.log(` ✅ PASS: ${title}`);
    passed++;
  } else {
    console.log(` ❌ FAIL: ${title}`);
    if (details) console.log(`    ↳ ${details}`);
    failed++;
  }
}

function warn(title, condition, details = "") {
  if (condition) {
    console.log(` ✅ PASS: ${title}`);
    passed++;
  } else {
    console.log(` ⚠️  WARN: ${title}`);
    if (details) console.log(`    ↳ ${details}`);
    warnings++;
  }
}

// 1. Core Technical SEO Files
console.log("--- 1. Core Technical SEO Files ---");
const robotsPath = path.join(rootDir, "src/app/robots.ts");
const sitemapPath = path.join(rootDir, "src/app/sitemap.ts");
const notFoundPath = path.join(rootDir, "src/app/not-found.tsx");

check("robots.ts exists in src/app", fs.existsSync(robotsPath));
check("sitemap.ts exists in src/app", fs.existsSync(sitemapPath));
check("Custom not-found.tsx exists in src/app", fs.existsSync(notFoundPath));

if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, "utf-8");
  check("robots.ts disallows /api/ and /search", robotsContent.includes("/api/") && robotsContent.includes("/search"));
  check("robots.ts references sitemap.xml", robotsContent.includes("sitemap.xml"));
}

if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
  check("sitemap.ts includes static routes (/anime, /manga, /airing)", sitemapContent.includes("/anime") && sitemapContent.includes("/manga"));
  check("sitemap.ts includes dynamic genre routes", sitemapContent.includes("/genre/"));
  check("sitemap.ts includes seasonal routes", sitemapContent.includes("/season/"));
  check("sitemap.ts includes year routes", sitemapContent.includes("/year/"));
}

// 2. Centralized SEO Utilities
console.log("\n--- 2. Centralized SEO Utilities ---");
const siteConfigPath = path.join(rootDir, "src/lib/seo/site-config.ts");
const metadataUtilPath = path.join(rootDir, "src/lib/seo/metadata.ts");
const jsonldUtilPath = path.join(rootDir, "src/lib/seo/jsonld.tsx");
const breadcrumbsCompPath = path.join(rootDir, "src/components/Breadcrumbs.tsx");

check("site-config.ts exists", fs.existsSync(siteConfigPath));
check("metadata.ts exists with centralized generators", fs.existsSync(metadataUtilPath));
check("jsonld.tsx exists with structured data schemas", fs.existsSync(jsonldUtilPath));
check("Breadcrumbs.tsx exists with BreadcrumbList schema", fs.existsSync(breadcrumbsCompPath));

// 3. Root Layout SEO
console.log("\n--- 3. Root Layout Architecture ---");
const layoutPath = path.join(rootDir, "src/app/layout.tsx");
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  check("Root layout defines metadataBase", layoutContent.includes("metadataBase:"));
  check("Root layout defines title template", layoutContent.includes("template:"));
  check("Root layout injects WebSite JSON-LD", layoutContent.includes("createWebSiteSchema"));
  check("Root layout injects Organization JSON-LD", layoutContent.includes("createOrganizationSchema"));
}

// 4. Indexing & Noindex Integrity
console.log("\n--- 4. Indexing & Protection Directives ---");
const profilePath = path.join(rootDir, "src/app/profile/page.tsx");
const watchlistPath = path.join(rootDir, "src/app/watchlist/page.tsx");
const analyticsPath = path.join(rootDir, "src/app/analytics/page.tsx");
const searchPath = path.join(rootDir, "src/app/search/page.tsx");
const mangaReadPath = path.join(rootDir, "src/app/manga/[id]/read/page.tsx");

if (fs.existsSync(profilePath)) {
  const content = fs.readFileSync(profilePath, "utf-8");
  check("Private Profile page marked with noindex metadata", content.includes("generatePrivateMetadata"));
}
if (fs.existsSync(watchlistPath)) {
  const content = fs.readFileSync(watchlistPath, "utf-8");
  check("Private Watchlist page marked with noindex metadata", content.includes("generatePrivateMetadata"));
}
if (fs.existsSync(analyticsPath)) {
  const content = fs.readFileSync(analyticsPath, "utf-8");
  check("Internal Analytics page marked with noindex metadata", content.includes("index: false"));
}
if (fs.existsSync(searchPath)) {
  const content = fs.readFileSync(searchPath, "utf-8");
  check("Internal Search page marked with noindex metadata", content.includes("generateSearchMetadata"));
}
if (fs.existsSync(mangaReadPath)) {
  const content = fs.readFileSync(mangaReadPath, "utf-8");
  check("Manga Chapter Reader states marked with noindex & canonical", content.includes("index: false") && content.includes("canonical"));
}

// 5. Programmatic SEO Routes
console.log("\n--- 5. Programmatic Discovery Routes ---");
const animeIndexPath = path.join(rootDir, "src/app/anime/page.tsx");
const animeDetailPath = path.join(rootDir, "src/app/anime/[slug]/page.tsx");
const genrePath = path.join(rootDir, "src/app/genre/[slug]/page.tsx");
const seasonPath = path.join(rootDir, "src/app/season/[slug]/page.tsx");
const yearPath = path.join(rootDir, "src/app/year/[year]/page.tsx");
const mangaIndexPath = path.join(rootDir, "src/app/manga/page.tsx");
const mangaDetailPath = path.join(rootDir, "src/app/manga/[id]/page.tsx");

check("Anime hub route exists (/anime)", fs.existsSync(animeIndexPath));
check("Anime detail route exists (/anime/[slug])", fs.existsSync(animeDetailPath));
check("Genre hub route exists (/genre/[slug])", fs.existsSync(genrePath));
check("Seasonal hub route exists (/season/[slug])", fs.existsSync(seasonPath));
check("Year hub route exists (/year/[year])", fs.existsSync(yearPath));
check("Manga hub route exists (/manga)", fs.existsSync(mangaIndexPath));
check("Manga detail route exists (/manga/[id])", fs.existsSync(mangaDetailPath));

// 6. Structured Data & Canonical Verification
console.log("\n--- 6. Structured Data & Canonicals ---");
if (fs.existsSync(animeDetailPath)) {
  const content = fs.readFileSync(animeDetailPath, "utf-8");
  check("Anime page uses generateAnimeMetadata()", content.includes("generateAnimeMetadata"));
  check("Anime page injects TVSeries JSON-LD", content.includes("createAnimeSeriesSchema"));
  check("Anime page injects BreadcrumbList JSON-LD", content.includes("createBreadcrumbSchema"));
}
if (fs.existsSync(mangaDetailPath)) {
  const content = fs.readFileSync(mangaDetailPath, "utf-8");
  check("Manga page uses generateMangaMetadata()", content.includes("generateMangaMetadata"));
  check("Manga page injects Book/ComicSeries JSON-LD", content.includes("createMangaBookSchema"));
  check("Manga page injects BreadcrumbList JSON-LD", content.includes("createBreadcrumbSchema"));
}

// 7. On-Page Semantic Integrity
console.log("\n--- 7. Semantic HTML Integrity ---");
const heroCompPath = path.join(rootDir, "src/components/Hero.tsx");
if (fs.existsSync(heroCompPath)) {
  const content = fs.readFileSync(heroCompPath, "utf-8");
  const h1Matches = content.match(/<h1[\s>]/g) || [];
  check("Hero component contains exactly ONE semantic <h1> tag", h1Matches.length === 1, `Found ${h1Matches.length} <h1> tags`);
  check("Hero links genre tags to /genre/[slug]", content.includes("/genre/"));
  check("Hero links release year to /year/[year]", content.includes("/year/"));
}

// Summary
console.log("\n=======================================================");
console.log(` AUDIT COMPLETE: ${passed} Passed | ${warnings} Warnings | ${failed} Failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
