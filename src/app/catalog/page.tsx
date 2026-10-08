import Navbar from "@/components/Navbar";
import CatalogFilters from "@/components/CatalogFilters";
import CatalogGrid from "@/components/CatalogGrid";
import Pagination from "@/components/Pagination";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getCatalogAnime, CatalogFilters as ApiFilters } from "@/lib/api";
import { generateCatalogMetadata } from "@/lib/seo/metadata";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { Suspense } from "react";
import type { Metadata } from "next";

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const genre = typeof searchParams.genre === "string" ? searchParams.genre : undefined;
  const year = typeof searchParams.year === "string" ? searchParams.year : undefined;
  const season = typeof searchParams.season === "string" ? searchParams.season : undefined;
  const format = typeof searchParams.format === "string" ? searchParams.format : undefined;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined;

  return generateCatalogMetadata({ genre, year, season, format, sort });
}

export default async function CatalogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const genre = typeof searchParams.genre === "string" ? searchParams.genre : undefined;
  const year = typeof searchParams.year === "string" ? searchParams.year : undefined;
  const season = typeof searchParams.season === "string" ? searchParams.season : undefined;
  const format = typeof searchParams.format === "string" ? searchParams.format : undefined;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined;

  // Parse page with fallback to 1
  let page = 1;
  if (typeof searchParams.page === "string") {
    const parsedPage = parseInt(searchParams.page, 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  const filters: ApiFilters = {
    genre,
    year,
    season,
    format,
    sort,
    page,
  };

  const { data, meta } = await getCatalogAnime(filters);

  // Calculate total pages (Kitsu returns meta.count for total elements, limit is 20)
  const totalCount = meta.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  // Determine Dynamic Heading
  let pageHeading = "Anime Catalog";
  if (format === "movie") {
    pageHeading = "Anime Movies";
  } else if (sort === "newest" || sort === "-startDate") {
    pageHeading = "New Anime Releases";
  } else if (sort === "rating" || sort === "rated") {
    pageHeading = "Highest Rated Anime";
  } else if (sort === "popularity" || sort === "trending") {
    pageHeading = "Trending & Popular Anime";
  } else if (genre) {
    pageHeading = `${genre.toUpperCase()} Anime`;
  }

  const itemList = (data || []).map((a: any) => ({
    name: a.title,
    path: `/anime/${a.slug}`,
    image: a.posterImage || a.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <JsonLd schema={createItemListSchema(pageHeading, itemList)} />
      <Navbar />
      <div className="page-top-spacer"></div>

      {/* Sticky Filter Bar */}
      <Suspense fallback={<div className="h-20" />}>
        <CatalogFilters />
      </Suspense>

      <div className="tv-safe-container pt-6 space-y-6">
        <Breadcrumbs items={[{ name: "Catalog", path: "/catalog" }]} />

        <div className="flex items-center justify-between">
          <h1 className="text-3xl tv:text-4xl font-bold text-white">{pageHeading}</h1>
          <p className="text-slate-400 font-medium">{totalCount.toLocaleString()} results found</p>
        </div>

        <CatalogGrid animeList={data} />

        {totalCount > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            searchParams={searchParams}
          />
        )}
      </div>
    </main>
  );
}
