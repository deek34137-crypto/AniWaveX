# AniWaveX Hindi Anime Streaming Worker Architecture (v2.0.0)

## 1. System Overview

The AniWaveX Hindi Anime Streaming Worker is an edge-native Cloudflare Worker designed to aggregate, scrape, extract, normalize, and proxy Hindi and Indian regional dub anime streams.

It is deployed at:
`https://aniwavex-hindi-worker.rajverma159310.workers.dev`

### Core Capabilities
- **Multi-Provider Architecture**: Dynamic provider registry hosting **ToonStream** and **DesiDub** with automated failover and health prioritization.
- **Pure JavaScript Deobfuscator**: Integrated Dean Edwards unpacker (`eval(function(p,a,c,k,e,d)...)`) that extracts native `.m3u8` streams from packed hosts (StreamRuby, StreamWish, VidHide, Filemoon, EarnVids) without headless browser automation.
- **Multi-Audio Prioritization**: HLS master playlist rewrite engine that parses `#EXT-X-MEDIA:TYPE=AUDIO` tracks and promotes Hindi (`LANGUAGE="hin"`) to `DEFAULT=YES,AUTOSELECT=YES`.
- **Edge Circuit Breaker**: Per-provider health tracking (success rate, latency, consecutive failures) with half-open cooldown recovery.
- **SSRF-Protected Video Proxy**: Hardened media relay with domain allowlisting, byte-range request streaming, and relative URL rewriting for segments and keys.

---

## 2. Request & Execution Flow

```
                      Client / Next.js API Route (/api/stream)
                                         │
                                         ▼
                            GET /stream?title=...&ep=...
                                         │
                                         ▼
                             Provider Registry & Router
                                         │
                ┌────────────────────────┴────────────────────────┐
                ▼                                                 ▼
      Tier 1: ToonStream Provider                        Tier 1: DesiDub Provider
  (toonstream.us / toonstream.vip)                         (desidubanime.me)
                │                                                 │
        [Slug Resolution]                                 [Slug Resolution]
  (AniList titles + fuzzy match)                     (Instant search / nonce)
                │                                                 │
        [Episode Discovery]                               [Episode Discovery]
   (/episode/, /series/, AJAX)                     (HTML list + AJAX get_episodes)
                │                                                 │
        [Server Extraction]                               [Server Extraction]
                │                                                 │
  ┌─────────────┼─────────────┐                     ┌─────────────┼─────────────┐
  ▼             ▼             ▼                     ▼             ▼             ▼
VidMoly       AS-CDN      StreamRuby             VidMoly       StreamRuby     Cloud
(HLS)      (Multi-Audio)  (Unpacker)              (HLS)        (Unpacker)     (HLS)
  │             │             │                     │             │             │
  └─────────────┼─────────────┘                     └─────────────┼─────────────┘
                │                                                 │
                └────────────────────────┬────────────────────────┘
                                         ▼
                             Intelligent Stream Ranking
                                         │
                 1. Direct / Proxied HLS (Hindi Dub)
                 2. Master Multi-Audio HLS (Hindi default)
                 3. Direct MP4
                 4. Iframe embed fallbacks
                                         │
                                         ▼
                          JSON Response (Contract Compliant)
                     { success: true, stream_url, streams, ... }
```

---

## 3. Component Breakdown

### A. Provider Interface & Registry (`src/providers/base.js`, `src/registry.js`)
Every provider implements `BaseProvider`:
- `search(query)`: Finds matches across provider search APIs.
- `resolveSlug(queryOrId, fallbackTitle)`: Converts AniList/MAL metadata into provider-specific show slugs.
- `getEpisodes(seriesSlug)`: Returns normalized episode objects `{ id, number, season, title, audio: "hi" }`.
- `getStreams(seriesSlug, epIdentifier, options)`: Returns candidate stream objects with HLS/embed URLs, headers, and audio tracks.

`ProviderRegistry` manages provider lifecycle:
- Queries active healthy providers in priority order.
- Applies speculative parallel execution with short timeouts.
- Seamlessly falls back to secondary providers if the primary provider trips circuit limits or yields 0 playable sources.

### B. Dean Edwards Unpacker (`src/utils/unpacker.js`)
Deobfuscates packed scripts on the fly.
1. Matches `eval(function(p,a,c,k,e,d)...)` or variants.
2. Expands base-36/radix tokens using dictionary replacement.
3. Extracts direct `.m3u8` playlists and WebVTT captions from the deobfuscated payload.

### C. Master Playlist Audio Auto-Selection (`src/proxy.js`)
When AS-CDN or other multi-audio providers return an HLS master playlist with multiple audio tracks:
1. The proxy parses `#EXT-X-MEDIA:TYPE=AUDIO`.
2. Locates tracks with `LANGUAGE="hin"` or `NAME="Hindi"`.
3. If no audio track has `DEFAULT=YES`, rewrites `DEFAULT=NO` to `DEFAULT=YES` and `AUTOSELECT=NO` to `AUTOSELECT=YES`.
4. Web and mobile video players immediately start playing Hindi dubbed audio by default without requiring manual track switching.

### D. Security & SSRF Guard (`src/proxy.js`)
To prevent open proxy abuse:
- Only approved video CDN patterns (e.g. `*.vidmoly.*`, `as-cdn*.top`, `*.rubyvidhub.com`, `*.streamwish.*`, `*.desidubanime.me`, etc.) are allowed.
- Requests targeting private network IPs (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `localhost`) are blocked immediately with HTTP 403.
- Range requests are forwarded for seamless video seeking.

---

## 4. API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | System status, version, provider health metrics, and active mirror endpoints |
| `/diagnostic` | GET | Detailed provider circuit statistics (successes, failures, latency) |
| `/search?q=:query` | GET | Aggregated anime search across all healthy providers (optional `?provider=...`) |
| `/episodes?slug=:slug` | GET | Episode list resolution for a series slug (optional `?title=...`) |
| `/stream?title=:title&ep=:ep` | GET | Primary streaming endpoint (returns prioritized HLS streams and embeds) |
| `/watch/:slug/:ep` | GET | Canonical watch route |
| `/proxy?url=:url&ref=:ref` | GET | Secure media proxy for HLS manifests, TS segments, and captions |
