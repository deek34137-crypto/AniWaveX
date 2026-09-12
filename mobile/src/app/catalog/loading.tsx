import Navbar from "@/components/Navbar";

export default function CatalogLoading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-16"></div>
      
      {/* Skeleton Filter Bar */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-y border-white/10 sticky top-16 z-40 shadow-xl h-[73px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="h-9 w-48 bg-slate-800 rounded-lg animate-pulse"></div>
          <div className="h-6 w-32 bg-slate-800 rounded-lg animate-pulse"></div>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[2/3] w-full bg-slate-800 rounded-2xl animate-pulse"></div>
              <div className="h-5 w-3/4 bg-slate-800 rounded-md animate-pulse"></div>
              <div className="h-4 w-1/2 bg-slate-800 rounded-md animate-pulse mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
