import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    staleTimes: {
      dynamic: 300, // 5 min client router cache for dynamic routes (instant back/forward!)
      static: 1800, // 30 min cache for static segments
    },
    scrollRestoration: true,
    optimizePackageImports: [
      "lucide-react",
      "@vidstack/react",
      "@supabase/ssr",
      "@supabase/supabase-js",
    ],
  },
  images: {
    unoptimized: true,
    qualities: [75, 85],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.kitsu.app",
      },
      {
        protocol: "https",
        hostname: "**.kitsu.io",
      },
      {
        protocol: "https",
        hostname: "kitsu.io",
      },
      {
        protocol: "https",
        hostname: "kitsu.app",
      },
      {
        protocol: "https",
        hostname: "media.kitsu.app",
      },
      {
        protocol: "https",
        hostname: "media.kitsu.io",
      },
      {
        protocol: "https",
        hostname: "**.backblazeb2.com",
      },
      {
        protocol: "https",
        hostname: "**.s3.*.backblazeb2.com",
      },
      {
        protocol: "https",
        hostname: "kitsu-production-media.s3.us-west-002.backblazeb2.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.anilist.co",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
      {
        protocol: "https",
        hostname: "**.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "myanimelist.cdn-dena.com",
      },
      {
        protocol: "https",
        hostname: "images.weserv.nl",
      },
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "cdn.anime-dunya.com",
      },
      {
        protocol: "https",
        hostname: "**.atomic4cdn.top",
      },
      {
        protocol: "https",
        hostname: "**.flixcloud.cc",
      },
    ],
  },
};

export default nextConfig;
