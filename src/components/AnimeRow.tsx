import AnimeCard from "@/components/AnimeCard";

interface AnimeRowProps {
  title: string;
  items: any[];
}

export default function AnimeRow({ title, items }: AnimeRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-12 mb-8">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-6 px-2">
        {title}
      </h2>
      
      {/* Horizontal scroll container */}
      <div className="flex overflow-x-auto gap-4 pb-6 px-2 snap-x snap-mandatory hide-scrollbar">
        {items.map((anime) => (
          <div key={anime.id} className="snap-start shrink-0 w-[200px] md:w-[240px]">
            <AnimeCard
              anime={anime}
              sizes="(max-width: 768px) 200px, 240px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
