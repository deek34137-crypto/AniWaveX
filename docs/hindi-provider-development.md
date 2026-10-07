# Adding New Hindi Anime Providers: Developer Guide

This guide describes how to implement and register a new provider inside `hindi-stream-worker`.

---

## 1. Provider Architecture

Every provider inherits from `BaseProvider` (`src/providers/base.js`).

```javascript
import { BaseProvider } from './base.js';

export class ExampleProvider extends BaseProvider {
  constructor() {
    super({
      id: 'example',
      name: 'Example Anime',
      languages: ['hi'],
      type: 'hindi',
      priority: 8, // Higher priority providers run first
      enabled: true,
    });
  }

  async search(query) {
    // 1. Send query to provider search API
    // 2. Return Array<{ id, slug, title, type, url, provider: this.id }>
  }

  async resolveSlug(queryOrId, fallbackTitle = '') {
    // 1. Accept AniList ID or candidate titles
    // 2. Score candidate titles against search results
    // 3. Return resolved slug string or null
  }

  async getEpisodes(seriesSlug) {
    // 1. Fetch series page or episode listing API
    // 2. Return Array<{ id, number, season, title, audio: 'hi', provider: this.id }>
  }

  async getStreams(seriesSlug, epIdentifier, options = {}) {
    // 1. Fetch watch page or player iframe for the episode
    // 2. Run host extractors (VidMoly, Ruby, Wish, etc.)
    // 3. Return { provider: this.id, streams: [...], subtitles: [...] }
  }
}
```

---

## 2. Implementing Host Extractors

Extractors live in `src/extractors/`. If your provider introduces a new video host, create a dedicated extractor file:

```javascript
// src/extractors/myhost.js
import { unpackPacked, extractM3u8FromText } from '../utils/unpacker.js';

export async function extractMyHost(embedUrl) {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': '...',
        'Referer': '...',
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // If script is packed with Dean Edwards:
    const unpacked = html.includes('eval(function(p,a,c') ? unpackPacked(html) : html;
    const m3u8 = extractM3u8FromText(unpacked);

    if (!m3u8) return null;

    return {
      server: 'MyHost',
      m3u8,
      directUrl: m3u8,
      referer: embedUrl,
      subtitles: [],
    };
  } catch {
    return null;
  }
}
```

---

## 3. Registering the Provider

Add the new provider instance to `src/registry.js`:

```javascript
import { exampleProvider } from './providers/example.js';

export class ProviderRegistry {
  constructor() {
    this.providers = [
      toonstreamProvider,
      desidubProvider,
      exampleProvider, // Added here
    ];
  }
  // ...
}
```

If the video host requires proxying through `/proxy`, add its domain pattern to `ALLOWED_DOMAIN_PATTERNS` in `src/proxy.js`.

---

## 4. Testing & Verification

1. Run the test suite:
   ```bash
   cd hindi-stream-worker
   node test-runner.js
   ```

2. Test the specific provider using the `provider` query parameter:
   ```bash
   node -e "fetch('http://localhost:8787/stream?title=Naruto&ep=1&provider=example').then(r=>r.json()).then(console.log)"
   ```

3. Deploy using Wrangler:
   ```bash
   npx wrangler deploy
   ```
