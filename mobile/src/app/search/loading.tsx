import Navbar from "@/components/Navbar";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-24"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-10 w-64 bg-slate-800 rounded animate-pulse mb-8"></div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-slate-900 rounded-2xl animate-pulse border border-slate-800"></div>
          ))}
        </div>
      </div>
    </main>
  );
}
