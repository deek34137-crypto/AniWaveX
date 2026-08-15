import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build the URL for a specific page
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    
    // Copy existing search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value));
      }
    });

    // Set the new page number
    params.set("page", pageNumber.toString());
    
    return `/catalog?${params.toString()}`;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center gap-6 mt-16 mb-8">
      {hasPrev ? (
        <Link 
          href={createPageUrl(currentPage - 1)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-slate-600 font-semibold rounded-xl border border-transparent cursor-not-allowed">
          <ChevronLeft className="w-5 h-5" />
          Previous
        </div>
      )}

      <div className="text-slate-400 font-medium">
        Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
      </div>

      {hasNext ? (
        <Link 
          href={createPageUrl(currentPage + 1)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-white/10 transition-colors"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-slate-600 font-semibold rounded-xl border border-transparent cursor-not-allowed">
          Next
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
