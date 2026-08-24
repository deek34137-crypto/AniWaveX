import AnimeCard from "@/components/AnimeCard";

export default function CatalogGrid({ animeList }: { animeList: any[] }) {
  if (!animeList || animeList.length === 0) {
    return (
      <div className="w-full text-center py-32 bg-slate-900/30 border border-slate-800 rounded-2xl">
        <h2 className="text-2xl text-slate-300 font-semibold mb-2">No anime found</h2>
        <p className="text-slate-500">Try adjusting your filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {animeList.map((anime) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
      ))}
    </div>
  );
}
