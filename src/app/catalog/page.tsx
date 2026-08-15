import Navbar from "@/components/Navbar";
import CatalogFilters from "@/components/CatalogFilters";
import CatalogGrid from "@/components/CatalogGrid";
import Pagination from "@/components/Pagination";
import { getCatalogAnime, CatalogFilters as ApiFilters } from "@/lib/api";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function CatalogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  
  const genre = typeof searchParams.genre === 'string' ? searchParams.genre : undefined;
  const year = typeof searchParams.year === 'string' ? searchParams.year : undefined;
  const season = typeof searchParams.season === 'string' ? searchParams.season : undefined;
  const format = typeof searchParams.format === 'string' ? searchParams.format : undefined;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : undefined;
  
  // Parse page with fallback to 1
  let page = 1;
  if (typeof searchParams.page === 'string') {
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
    page
  };

  const { data, meta } = await getCatalogAnime(filters);

  // Calculate total pages (Kitsu returns meta.count for total elements, limit is 20)
  const totalCount = meta.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  // Determine Dynamic Heading
  let pageHeading = "Catalog";
  if (format === 'movie') {
    pageHeading = "Movies";
  } else if (sort === 'newest' || sort === '-startDate') {
    pageHeading = "New Releases";
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-16"></div>
      
      {/* Sticky Filter Bar */}
      <Suspense fallback={<div className="h-20" />}>
        <CatalogFilters />
      </Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">{pageHeading}</h1>
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
