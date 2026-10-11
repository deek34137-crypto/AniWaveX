import Navbar from "@/components/Navbar";

export default function MangaLoading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      {/* Hero Banner Shimmer */}
      <div className="w-full h-72 sm:h-80 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="tv-safe-container h-full flex flex-col justify-end pb-8">
          <div className="w-56 h-8 rounded-xl bg-slate-800/80 mb-3 animate-pulse" />
          <div className="w-96 h-5 rounded-lg bg-slate-800/60 animate-pulse" />
        </div>
      </div>

      <div className="tv-safe-container pt-8 space-y-10">
        {/* Genre Pills Shimmer */}
        <div className="flex gap-2 overflow-hidden py-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-slate-900 border border-white/5 shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Popular Manga Grid Shimmer */}
        <div className="space-y-4">
          <div className="w-48 h-6 rounded-lg bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="aspect-[3/4] w-full rounded-2xl bg-slate-900/90 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
                <div className="h-4 w-3/4 rounded-md bg-slate-800 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-slate-800/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
