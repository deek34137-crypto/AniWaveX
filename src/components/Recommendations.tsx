import AnimeCard from "@/components/AnimeCard";

interface RecommendationsProps {
  items: any[];
}

export default function Recommendations({ items }: RecommendationsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-24 mb-16 px-2">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-8">You Might Also Like</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {items.map((item) => (
          <AnimeCard
            key={item.id}
            anime={item}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ))}
      </div>
    </div>
  );
}
