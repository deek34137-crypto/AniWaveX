# Current Hindi Worker vs Anivault-Scraper vs MSR Anime Extensions

Detailed comparative audit between:
1. **Current Worker**: `hindi-stream-worker/index.js`
2. **Anivault-Scraper**: `.audit/anivault-scraper/`
3. **MSR Anime Extensions**: `.audit/msr-anime-extensions/`

---

## 1. Architectural Comparison

| Dimension | Current Worker (`hindi-stream-worker`) | Anivault-Scraper | MSR Anime Extensions | Target Upgrade State |
|---|---|---|---|---|
| **Runtime Environment** | Cloudflare Worker (V8 isolate) | Node.js (Express server) | Android / JVM (Kotlin + OkHttp + Jsoup) | Cloudflare Worker (Web APIs + Edge Optimized) |
| **Provider Architecture** | Monolithic single-file script (`index.js`) | Scraper modules (`scrapers/`, `resolvers/`) | Extension classes (`AnimeHttpSource`) | Modular Provider Registry (`Provider` interface) |
| **Supported Hindi Providers** | 1 (ToonStream only) | 1 (DesiDub) | 3 (Toonstream, AnimeDubHindi, MovieBox) | **Multi-Provider: ToonStream + DesiDub** (+ fallback mirrors) |
| **Server Extractors** | VidMoly (regex), AS-CDN (FirePlayer API), Turbovid (regex). Rest are embed iframes. | VidMoly, StreamRuby, EarnVids, RPMStream, GDMirrorBot, Cloud, Abyss. | VidMoly, AS-CDN (AWSStream), StreamWish, VidHide, Filemoon, Dood. | **Full Suite: VidMoly, AS-CDN, Turbovid, StreamRuby, StreamWish, VidHide, Filemoon, EarnVids, Cloud, Abyss** |
| **JavaScript Deobfuscator** | ❌ None (leaves packed hosts as embeds) | ✅ Pure JS unpacker for Dean Edwards | ✅ Kotlin `JsUnpacker` / `AutoUnpacker` | ✅ Edge-optimized Dean Edwards unpacker (pure JS) |
| **Multi-Audio Hindi Enforcement** | Reads audio tracks, but does not rewrite playlist default | Rewrites playlist `DEFAULT=YES` for first audio track | Extracts tracks via PlaylistUtils | Master playlist rewriting + promotes Hindi track to default |
| **Provider Failover / Aggregation** | ❌ None (Single provider fails -> 404) | Query single requested source | Sequential per-extension | **Intelligent multi-provider speculative aggregation & tiered failover** |
| **Circuit Breaker / Health** | ❌ None | In-memory cache | Preferences-based | **Lightweight Edge Circuit Breaker & Health Monitor** |
| **Proxy Security** | Open query proxy (no host restriction) | Parameterized `/api/proxy/hls` | Direct OkHttp client | **Allowed CDN host whitelist, SSRF protection, signed query headers** |
| **Subtitle Normalization** | Always returns empty `subtitles: []` | Returns `.vtt`/`.srt` with language labels | Parses `Track(url, label)` | Full normalization of VTT/SRT subtitles |

---

## 2. Gap Analysis

### A. Missing Providers
- **DesiDub (`desidubanime.me`)**: Missing from current worker.
  - Huge catalog of Hindi dubbed anime.
  - Active instant search, multi-page episode catalog.
  - High availability of direct HLS video servers (VidMoly, StreamRuby, Cloud).
- **AnimeDubHindi (`animedubhindi.top`)**: Evaluated from MSR extensions.
  - Primarily consists of DDL file lockers (GDFlix, HubCloud, Gofile). Not suitable for direct streaming without complex multi-step download solvers.
- **MovieBox (`api3.aoneroom.com`)**: Evaluated from MSR extensions.
  - Mobile app API with rotating HMAC-MD5 app signatures. Not specific to Hindi anime and high risk of edge blockage.

### B. Better Implementations Discovered in Repositories
1. **Dean Edwards JavaScript Deobfuscation**:
   - Both Anivault and MSR demonstrated that servers like `rubyvidhub`, `streamruby`, `streamwish`, `filelions`, `vidhide`, and `filemoon` deliver direct `.m3u8` playlists inside packed JS (`eval(function(p,a,c,k,e,d)...)`).
   - In our current worker, all of these were falling back to iframe embeds. With the unpacker ported to Web APIs, our worker can extract native HLS for these hosts!
2. **AS-CDN / FirePlayer Multi-Audio**:
   - Both current worker and MSR support AS-CDN, but MSR shows fallback when hash is in script `FirePlayer("...")` or packed JS.
   - Anivault demonstrates HLS playlist rewriting to auto-select and promote Hindi audio tracks.
3. **ToonStream Mirror Redundancy**:
   - Both current worker and MSR pull from `https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json`.
   - Current worker should maintain this while also adding fallback mirrors.

### C. Duplicate / Obsolete Implementations
- Do not duplicate ToonStream logic; instead, refine ToonStream into a modular provider adhering to the new `Provider` interface.
- Keep all existing routes (`/health`, `/search`, `/episodes`, `/stream`, `/watch`, `/proxy`) 100% backward compatible for existing frontend and API consumers.
