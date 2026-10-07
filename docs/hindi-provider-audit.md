# Deep Audit of External Repositories for Hindi Anime Streaming

## 1. Audited Repositories

### Repository 1: Anivault-Scraper
- **Repository**: `https://github.com/SH0MIK/Anivault-Scraper`
- **Architecture**: Node.js + Express + Axios + Cheerio.
- **Key Modules**:
  - `src/scrapers/desidub.ts`: Scraper for `https://www.desidubanime.me`.
  - `src/routes.ts`: Watch routes, proxy endpoints (`/api/proxy/hls`, `/api/proxy/video`), and HLS playlist rewriting.
  - `src/utils/mapper.ts`: AniList/MAL metadata mapping to provider slugs.
  - `src/resolvers/megacloud.ts`: MegaCloud/RabbitStream decryption.
- **Core Insights**:
  - **DesiDub** has an extensive Hindi anime library with multiple active mirrors and video hosts (VidMoly, StreamRuby, EarnVids, Cloud, AbyssPlayer).
  - Uses Dean Edwards packed JavaScript deobfuscation to extract `.m3u8` from StreamRuby, EarnVids, and GDMirrorBot.
  - Employs rate-limiting guards and sequential request queuing to prevent 429 origin throttling.

### Repository 2: MSR Anime Extensions
- **Repository**: `https://github.com/msrofficial/anime-extensions`
- **Architecture**: Kotlin / JVM Aniyomi Extensions (Tachiyomi framework + OkHttp + Jsoup).
- **Key Modules in `src/hi`**:
  - `src/hi/toonstream/src/.../Toonstream.kt`: Scraper for ToonStream mirrors with dynamic TVVVV domain sync.
  - `src/hi/animedubhindi/src/.../AnimeDubHindi.kt`: Scraper for `animedubhindi.top` (mostly DDL file lockers like GDFlix, HubCloud, Gofile).
  - `src/hi/moviebox/src/.../MovieBox.kt`: Scraper for `api3.aoneroom.com` with reverse-engineered HMAC-MD5 app signatures.
  - Extractors in `lib/`: `vidmolyextractor`, `fireplayerextractor`, `streamwishextractor`, `vidhideextractor`, `filemoonextractor`.
- **Core Insights**:
  - ToonStream uses `https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json` to stay in sync with rotating mirrors.
  - Servers like StreamWish, VidHide, and Filemoon hide raw `.m3u8` playlists inside packed JavaScript. Once unpacked, direct HLS streams can be parsed.
  - AS-CDN / FirePlayer (`as-cdn*.top`) accepts POST requests to `/player/index.php?data=${hash}&do=getVideo` returning multi-audio master playlists.

---

## 2. Comprehensive Capability Matrix

| Provider / Feature | ToonStream | DesiDub | AnimeDubHindi | MovieBox |
|---|---|---|---|---|
| **Base Domain** | `https://toonstream.us` | `https://www.desidubanime.me` | `https://www.animedubhindi.top` | `https://api3.aoneroom.com` |
| **Search Mechanism** | JSON `/search/all` + WP HTML | AJAX `instant_search` with nonce + Advanced POST | WP query `/?s=` | Mobile BFF POST `/search/v2` |
| **Episode Discovery** | URL pattern matching + series page inspection | Static list + AJAX `get_episodes` | Link pages (`links.animedubhindi`) | JSON `/season-info` API |
| **Direct HLS Extraction** | VidMoly, AS-CDN, Turbovid, StreamRuby, StreamWish, VidHide, Filemoon | VidMoly, StreamRuby, Cloud, EarnVids, GDMirrorBot | Rare (Mostly DDL file download lockers) | HLS with signed cookies |
| **Multi-Audio Handling** | AS-CDN multi-audio (Hin, Eng, Jpn, Tam, Tel) | Multi-audio HLS playlists | Multi-audio file descriptions | Multilingual dub subjects |
| **Worker Compatibility** | 100% (Native Web APIs) | 100% (Native Web APIs) | Low (requires captcha / DDL solver) | Medium (HMAC app tokens expire) |
| **Integration Decision** | **Integrated (Primary Tier 1)** | **Integrated (Primary Tier 1)** | Excluded (DDL only) | Excluded (App API fragile) |

---

## 3. Comparison with Legacy Hindi Worker

| Capability | Legacy Worker (v1.3.0) | Upgraded Worker (v2.0.0) |
|---|---|---|
| **Provider Count** | 1 (ToonStream only) | 2 (ToonStream + DesiDub) |
| **Failover Support** | None (Single point of failure) | Automatic failover & circuit breaker |
| **JavaScript Unpacker** | None (Treated Ruby/Wish as iframe embeds) | Pure JS Dean Edwards unpacker (Extracts HLS!) |
| **Ruby Extraction** | Iframe embed only | Direct HLS `.m3u8` |
| **StreamWish Extraction**| Iframe embed only | Direct HLS `.m3u8` |
| **VidHide Extraction** | Iframe embed only | Direct HLS `.m3u8` |
| **Filemoon Extraction** | Iframe embed only | Direct HLS `.m3u8` |
| **DesiDub Cloud Extraction**| Not present | Direct HLS `.m3u8` |
| **Hindi Audio Track** | Listed in JSON | Rewritten as default in HLS master playlist |
| **Proxy Security** | Permitted arbitrary target URLs | Enforces strict CDN allowlist & private IP blocks |
| **Diagnostic API** | None | `/diagnostic` and `/health` with live metrics |
