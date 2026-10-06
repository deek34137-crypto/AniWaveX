# AniWaveX Manga Worker (`aniwavex-manga-worker`)

A high-performance, independent Cloudflare Worker dedicated to multi-provider manga extraction, aggregation, failover, normalization, and secure image proxying for **AniWaveX**.

- **Deployed URL:** `https://aniwavex-manga-worker.rajverma159310.workers.dev`
- **Health Check:** `https://aniwavex-manga-worker.rajverma159310.workers.dev/health`
- **Environment:** Cloudflare Workers (V8 runtime + `nodejs_compat`)

---

## 1. Upstream Research & Architecture

This worker adapts and ports server-side extraction concepts and source definitions from:
1. **Keiyoushi Extensions & Source** (`https://github.com/keiyoushi/extensions-source`)
   - Architecture: Kotlin-based source extractors (Tachiyomi/Mihon format).
   - Insights adapted: Source endpoints, HTML/DOM query selectors, image server hosts, pagination logic, and rate limiting patterns.
   - Licensing: Licensed under Apache License 2.0.
2. **Yūzōnō Manga Repo** (`https://github.com/yuzono/manga-repo`)
   - Architecture: Normalized extension registry, unified metadata schema, and failover patterns.
   - Licensing: Community open-source / MIT.

---

## 2. Provider Compatibility Matrix

| Provider | Type | Tier | Search | Details | Chapters | Pages | Edge Status | Notes |
|---|---|---|---|---|---|---|---|---|
| **MangaDex** | REST API | **Tier A** | ✅ | ✅ | ✅ | ✅ | **Active** | Primary international source; English, Hindi, Japanese, Spanish, etc. Official MangaPlus external links filtered automatically. |
| **WeebCentral** | HTML Scraper | **Tier A** | ✅ | ✅ | ✅ | ✅ | **Active** | Rock-solid scraper; verified 1,194 chapters for *One Piece* with direct high-resolution planeptune CDN scans. |
| **MangaKakalot** | HTML Scraper | **Tier A** | ✅ | ✅ | ✅ | ✅ | **Active** | Fallback catalog scraper. |
| **AsuraScans** | HTML Scraper | **Tier B** | ✅ | ✅ | ✅ | ✅ | **Active** | Manhwa/webtoon specialist fallback. |
| **FlameComics** | HTML Scraper | **Tier B** | ✅ | ✅ | ✅ | ✅ | **Active** | Manhwa/action specialist fallback. |
| **ComicK** | REST API | **Tier C** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **Disabled** | Upstream public API mirrors (`api.comick.fun`) offline / protected by Cloudflare Turnstile without WebView. |

---

## 3. Normalized REST API Reference

Base URL: `https://aniwavex-manga-worker.rajverma159310.workers.dev`

### Health & Metadata
- **`GET /health`**
  ```json
  { "ok": true, "service": "aniwavex-manga-worker", "version": "1.0.0" }
  ```
- **`GET /api/providers`**
  Returns all registered providers, their active tier, capabilities, supported languages, and latency/health telemetry.

### Manga Discovery & Search
- **`GET /api/search?q={query}&page={page}`**
  Multi-provider concurrent search (Tier A). Merges, scores similarity via Levenshtein distance, and deduplicates across providers.
- **`GET /api/manga/search?q={query}&provider={providerId}&language={lang}&page={page}`**
  Search targeted provider with automatic sequential fallback if the requested provider fails.
- **`GET /api/manga/popular?page={page}&provider={providerId}`**
  Trending and popular manga feed.
- **`GET /api/manga/latest?page={page}&provider={providerId}`**
  Latest chapter releases feed.

### Details & Chapters
- **`GET /api/manga/:provider/:id`**
  Normalized manga metadata (title, alt titles, cover, author, artist, genres, status, year, description).
- **`GET /api/manga/:provider/:id/chapters?language=en`**
  Cleaned chapter feed with parsed fractional chapter numbers, scanlator groups, release timestamps, and direct URLs.

### Reader Pages & Image Security
- **`GET /api/chapter/:provider/:id/pages`**
  Sequential reader pages with full image URLs and required upstream headers (e.g., Referer).
- **`GET /api/image/:provider?url={imageUrl}`**
  High-performance image proxy with:
  - **SSRF Defense**: Strict CIDR rejection for IPv4/IPv6 private ranges (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, `172.16.0.0/12`, `::1`, `fc00::/7`, `fe80::/10`).
  - **Hostname Whitelist**: Enforces upstream domains (`mangadex.org`, `planeptune.us`, `compsci88.com`, etc.).
  - **Immutable Caching**: Cloudflare CDN Edge Cache `max-age=604800` (7 days) with `stale-while-revalidate`.

### Backward-Compatibility Endpoints (AniWaveX Client)
The Worker implements native compatibility with existing AniWaveX client RPC signatures:
- **`POST /api/search`** — Body: `{ "query": "..." }` → `{ "results": [...] }`
- **`POST /api/chapters`** — Body: `{ "provider": "weebcentral", "id": "..." }` → `{ "chapters": [...] }`
- **`POST /api/pages`** — Body: `{ "provider": "weebcentral", "chapterId": "..." }` → `{ "pages": [...] }`

---

## 4. Local Testing & Verification

Inside `workers/aniwavex-manga-worker/`:

```bash
# Run 100% passing test suite (23 tests)
npm test

# Verify TypeScript build
npm run build
```

Test coverage includes:
- Provider discovery, capabilities & health metrics
- Chapter number extraction (fractional, hyphenated, volume-stripped, UUID-safe)
- Levenshtein title normalization & multi-source deduplication
- SSRF prevention (private IP rejection & unauthorized host blocking)
- E2E aggregated search, details, chapter feeds, and chapter page extractions

---

## 5. Deployment

```bash
# Deploy to Cloudflare Workers using Wrangler OAuth
npx wrangler deploy
```
