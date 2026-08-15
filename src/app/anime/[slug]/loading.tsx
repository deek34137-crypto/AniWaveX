import Navbar from "@/components/Navbar";

export default function AnimeLoading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32 pt-20">
      <Navbar />
      
      {/* Hero Skeleton */}
      <div className="relative w-full h-[50vh] md:h-[70vh] bg-slate-900 animate-pulse overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10" />
        
        <div className="absolute bottom-0 left-0 w-full z-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-8 items-end">
            <div className="hidden md:block w-48 md:w-64 aspect-[2/3] bg-slate-800 rounded-xl shadow-2xl flex-shrink-0" />
            <div className="flex-1 w-full">
              <div className="h-10 w-3/4 md:w-1/2 bg-slate-800 rounded-lg mb-4" />
              <div className="flex gap-4 mb-6">
                <div className="h-6 w-20 bg-slate-800 rounded-full" />
                <div className="h-6 w-24 bg-slate-800 rounded-full" />
              </div>
              <div className="h-24 w-full max-w-2xl bg-slate-800 rounded-lg mb-8" />
              <div className="flex gap-4">
                <div className="h-12 w-32 bg-slate-800 rounded-full" />
                <div className="h-12 w-12 bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        {/* Episodes Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-800 rounded-lg mb-6 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
