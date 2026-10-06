export const CONFIG = {
  SERVICE_NAME: 'aniwavex-manga-worker',
  VERSION: '1.0.0',
  DEFAULT_TIMEOUT_MS: 10000,
  MAX_CONCURRENT_PROVIDERS: 4,
  CACHE_TTL: {
    SEARCH: 3600, // 1 hour
    POPULAR: 21600, // 6 hours
    LATEST: 1800, // 30 minutes
    DETAILS: 86400, // 24 hours
    CHAPTERS: 21600, // 6 hours
    PAGES: 7200, // 2 hours
  },
  DEFAULT_HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'application/json, text/html, */*',
  },
  ALLOWED_IMAGE_HOSTS: [
    // MangaDex
    'uploads.mangadex.org',
    'mangadex.org',
    'mangadex.network',
    // WeebCentral
    'temp.compsci88.com',
    'compsci88.com',
    'weebcentral.com',
    'lastation.us',
    'scans.lastation.us',
    'lowee.us',
    'official.lowee.us',
    'scans.lowee.us',
    'planeptune.us',
    'leanbox.us',
    // Comick
    'comick.io',
    'comick.app',
    'comick.live',
    'meo.comick.pictures',
    'meo2.comick.pictures',
    'meo3.comick.pictures',
    // MangaKakalot / Chapmanganato
    'chapmanganato.to',
    'manganato.com',
    'mangakakalot.com',
    // Asura Scans / Comic
    'asuracomic.net',
    'asuratoon.com',
    'gg.asuracomic.net',
    // Flame Comics
    'flamecomics.me',
    'flamecomics.xyz',
    // MangaRead
    'mangaread.org',
    'www.mangaread.org',
    // Cover CDNs
    'anilist.co',
    's4.anilist.co',
    'kitsu.io',
    'media.kitsu.io',
    'myanimelist.net',
    'cdn.myanimelist.net',
  ],
};
