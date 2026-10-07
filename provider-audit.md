# Provider Capability Matrix (Audit of External Repositories)

Audit conducted on:
1. **Anivault-Scraper** (`https://github.com/SH0MIK/Anivault-Scraper`)
2. **MSR Anime Extensions** (`https://github.com/msrofficial/anime-extensions`)

---

## 1. Provider Capability Matrix

| Provider / Host | Source Repo | Base URL / Scope | Search | Hindi Dub | Episodes | Direct M3U8 | Direct MP4 | Subtitles | Extractor Type | Proxy Needed | Reliability | Worker Compatible |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **ToonStream** | MSR & Current Worker | `https://toonstream.us` / `toonstream.vip` / `toonstream.org` | Yes (AJAX & WP HTML) | Yes (Primary focus) | Yes (Season AJAX & HTML regex) | Yes (VidMoly, AS-CDN, Turbovid) | No (Embeds for Ruby, Streamwish) | Partial (AS-CDN, VidHide) | Multi-host scraper & Kiranime embed parser | Yes (for CORS-blocked CDNs) | High | Yes (100% Web API) |
| **DesiDub** | Anivault-Scraper | `https://www.desidubanime.me` | Yes (AJAX Instant + Advanced Search) | Yes (100% Hindi/Multi-Audio) | Yes (HTML lists + AJAX `get_episodes`) | Yes (VidMoly, Ruby, EarnVids, Cloud, GDMirrorBot) | Yes (Abyss MP4 chunks) | Yes (VTT/SRT multi-lang) | Multi-embed resolver with Dean Edwards unpacker + AES | Yes (for m3u8 and subtitles) | High | Yes (Pure JS unpacker & Web Crypto) |
| **AnimeDubHindi** | MSR Extensions | `https://www.animedubhindi.top` | Yes (WP search) | Yes | Yes (Link pages) | Rare (Mostly third-party file hosters) | No | No | DDL / File host scraper (GDFlix, HubCloud, Gofile) | High | Low for streaming (mostly DDL download lockers) | Partial (Requires scraping captcha/DDL lockers) |
| **MovieBox** | MSR Extensions | `https://api3.aoneroom.com` | Yes (JSON API) | Partial (General cinema/movies) | Yes (JSON API) | Yes (HLS with signed cookies) | Yes | Yes (VTT captions) | Reverse-engineered Android app API (HMAC-MD5 signing) | Yes | Medium/Low (Keys rotate, app tokens expire, anti-bot) | Feasible with Web Crypto HMAC, but prone to mobile ban |
| **Anikoto** | Anivault-Scraper | `https://anikoto.com` | Yes (REST) | No (Japanese / English Dub only) | Yes | Yes (MegaCloud decryption) | No | Yes | MegaCloud / RabbitStream decryptor | Yes | High (Non-Hindi) | Already in AniWaveX |
| **AnimeHeaven** | Anivault-Scraper | `https://animeheaven.me` | Yes | No (Sub/Eng Dub) | Yes | No | Yes (Direct MP4) | No | MP4 direct scraper | Yes | Medium | Non-Hindi |

---

## 2. Host Extractors Discovered in Repositories

| Host / Extractor | Discovered In | Mechanism | Extracted Output | Subtitle Support | Anti-Hotlink / Headers Required |
|---|---|---|---|---|---|
| **VidMoly** | Anivault & MSR | HTML scrape -> regex on `sources: [...]` or direct `.m3u8` | Direct HLS (`.m3u8`) | Yes (`.vtt`) | `Referer: https://vidmoly.biz/`, `Origin: https://vidmoly.biz` |
| **AS-CDN / FirePlayer / ZephyrFlick** | Current Worker & MSR | POST `hash` & `r` to `/player/index.php?data=${hash}&do=getVideo` | Master Multi-Audio HLS (`.m3u8`) with Hin/Eng/Jpn/Tam/Tel | Yes (SRT captions in page script) | `Referer: https://${domain}/`, `Origin: https://${domain}` |
| **StreamRuby / RubyVidHub** | Anivault & MSR | Dean Edwards packed JS `eval(function(p,a,c,k,e,d)...)` unpacker | Direct HLS (`.m3u8`) | Yes (`.vtt`, `.srt`) | `Referer: https://rubyvidhub.com/` |
| **StreamWish / FileLions / CdnWish** | MSR | Dean Edwards packed JS unpacker -> `https[^"]*m3u8[^"]*` | Direct HLS (`.m3u8`) | Yes (parsed from `tracks: [...]`) | `Referer: https://${host}/` |
| **VidHide / StreamHide / GucciHide** | MSR | Dean Edwards packed JS unpacker -> regex `(?:https?:/)?/[^"]*m3u8[^"]*` | Direct HLS (`.m3u8`) | Yes (parsed from `tracks: [...]`) | `Referer: https://${host}/` |
| **Filemoon** | MSR | Dean Edwards packed JS unpacker -> `{file:"..."}` | Direct HLS (`.m3u8`) | Yes (`sub.info` endpoint or script) | `Referer: https://${host}/`, `Origin: https://${host}` |
| **EarnVids / SmoothPre** | Anivault | Dean Edwards packed JS unpacker -> `"hls\d*":"..."` | Direct HLS (`.m3u8`) | Yes | `Referer: https://gdmirrorbot.nl/` |
| **GDMirrorBot** | Anivault | POST to `/embedhelper2.php` with `sid` -> resolves sub-mirrors | Multi-mirror HLS (VidMoly, Ruby, EarnVids) | Yes | `Referer: https://gdmirrorbot.nl/` |
| **Cloud (cloud.desidubanime.me)** | Anivault | Traverses `/external/` -> `/play/`, extracts JWPlayer config | Direct HLS (`.m3u8`) | Yes | `Referer: https://cloud.desidubanime.me/` |
| **Turbovid** | Current Worker | Scrapes emturbovid.com embed HTML -> regex `.m3u8` | Direct HLS (`.m3u8`) | No | `Referer: https://emturbovid.com/` |
| **AbyssPlayer** | Anivault & Current Worker | Decodes base64 payload -> AES-CTR decryption (md5 key material) | Direct HLS or MP4 source chunks; iframe fallback | Yes | `Referer: embedUrl` |

---

## 3. Key Findings & Strategic Recommendations

1. **DesiDub is the #1 Missing Hindi Provider**:
   - `desidubanime.me` is an active, high-volume dedicated Hindi anime streaming source.
   - It hosts hundreds of Hindi-dubbed anime series and movies.
   - Its embed mechanism contains direct HLS sources across VidMoly, StreamRuby, EarnVids, Cloud, and GDMirrorBot.
   - **Recommendation**: Integrate DesiDub as a core Tier-1 Hindi provider alongside ToonStream in the Cloudflare Worker.

2. **Dean Edwards JavaScript Unpacker is the Missing Key**:
   - Both StreamRuby, StreamWish, VidHide, Filemoon, and EarnVids use Dean Edwards packed JavaScript (`eval(function(p,a,c,k,e,d)...)`).
   - In the existing worker, any server with StreamWish or StreamRuby was treated as an unextracted iframe embed fallback.
   - Integrating a pure JavaScript Dean Edwards unpacker into the Cloudflare Worker allows instant client-side extraction of raw `.m3u8` streams from these servers without any browser automation!

3. **Multi-Audio Track Handling (AS-CDN)**:
   - AS-CDN provides master playlists containing Hindi, Tamil, Telugu, Japanese, and English audio tracks.
   - When proxying master playlists, we should ensure the `#EXT-X-MEDIA:TYPE=AUDIO` track for Hindi (`LANGUAGE="hin"`) is promoted to `DEFAULT=YES,AUTOSELECT=YES` if no default is declared, guaranteeing video players immediately playback Hindi audio.

4. **Security & Worker Proxy Hardening**:
   - The `/proxy` endpoint must enforce an allowlist of approved video CDN hostnames/patterns and validate URLs to avoid open-proxy / SSRF abuse.
