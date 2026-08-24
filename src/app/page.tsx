import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import { getTrendingAnime, getTopRatedAnime } from "@/lib/api";

export default async function Home() {
  const [trending, topRated] = await Promise.all([
    getTrendingAnime(),
    getTopRatedAnime()
  ]);

  // Use top 5 trending anime for the hero slider
  const heroAnimeList = trending.slice(0, 5);
  // The rest for the trending row
  const trendingRow = trending.slice(5);

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <HeroSlider animeList={heroAnimeList} />
        
        <ContinueWatchingRow />

        <AnimeRow title="Trending Now" items={trendingRow} />
        <AnimeRow title="Highest Rated" items={topRated} />
      </div>
    </main>
  );
}
