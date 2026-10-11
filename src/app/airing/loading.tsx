import Navbar from "@/components/Navbar";

export default function AiringLoading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-8 space-y-8">
        <div className="space-y-2">
          <div className="w-56 h-8 rounded-xl bg-slate-800 animate-pulse" />
          <div className="w-80 h-4 rounded-lg bg-slate-800/60 animate-pulse" />
        </div>

        {/* Day Pills Shimmer */}
        <div className="flex gap-2 overflow-hidden py-1">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
            <div key={day} className="h-10 w-28 rounded-2xl bg-slate-900 border border-white/5 shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Airing Schedule Cards Shimmer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="w-20 h-28 rounded-xl bg-slate-800 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-slate-800/60 animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-slate-800/80 animate-pulse mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
