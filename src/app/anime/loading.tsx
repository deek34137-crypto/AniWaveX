import Navbar from "@/components/Navbar";

export default function AnimeLoading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      {/* Shimmer Hero Skeleton */}
      <div className="w-full h-80 sm:h-96 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="tv-safe-container h-full flex flex-col justify-end pb-8">
          <div className="w-48 h-8 rounded-xl bg-slate-800/80 mb-3 animate-pulse" />
          <div className="w-80 h-5 rounded-lg bg-slate-800/60 animate-pulse" />
        </div>
      </div>

      <div className="tv-safe-container pt-8 space-y-10">
        {/* Row 1 Shimmer */}
        <div className="space-y-4">
          <div className="w-40 h-6 rounded-lg bg-slate-850 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="aspect-[3/4] w-full rounded-2xl bg-slate-900/90 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
                <div className="h-4 w-3/4 rounded-md bg-slate-850 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-slate-850/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 Shimmer */}
        <div className="space-y-4">
          <div className="w-48 h-6 rounded-lg bg-slate-850 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="aspect-[3/4] w-full rounded-2xl bg-slate-900/90 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
                <div className="h-4 w-3/4 rounded-md bg-slate-850 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-slate-850/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
