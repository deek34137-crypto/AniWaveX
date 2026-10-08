import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/anime/",
          "/manga",
          "/manga/*",
          "/genre/",
          "/season/",
          "/year/",
          "/airing",
          "/catalog",
          "/tier-list",
          "/tier-list/community",
        ],
        disallow: [
          "/api/",
          "/profile",
          "/watchlist",
          "/analytics",
          "/search",
          "/manga/*/read",
          "/_next/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/anime/",
          "/manga",
          "/manga/*",
          "/genre/",
          "/season/",
          "/year/",
          "/airing",
          "/catalog",
        ],
        disallow: [
          "/api/",
          "/profile",
          "/watchlist",
          "/analytics",
          "/search",
          "/manga/*/read",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
