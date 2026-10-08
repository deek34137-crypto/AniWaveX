import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import JumpBackInRow from "@/components/JumpBackInRow";
import TodayAiringRow from "@/components/TodayAiringRow";
import { getTrendingAnime, getTopRatedAnime, getGenreAnime } from "@/lib/api";
import { getUnifiedAiringSchedule } from "@/lib/schedule";

export default async function Home() {
  const [trending, topRated, romance, comedy, isekai, airingSchedule] = await Promise.all([
    getTrendingAnime(),
    getTopRatedAnime(),
    getGenreAnime("romance", 12),
    getGenreAnime("comedy", 12),
    getGenreAnime("isekai", 12),
    getUnifiedAiringSchedule().catch(() => []),
  ]);

  // Use top 5 trending anime for the hero slider
  const heroAnimeList = trending.slice(0, 5);
  // The rest for the trending row
  const trendingRow = trending.slice(5);

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="tv-safe-container space-y-4 tv:space-y-8">
        <HeroSlider animeList={heroAnimeList} />
        
        <JumpBackInRow />

        <TodayAiringRow initialSchedule={airingSchedule} />

        <AnimeRow title="Trending Now" items={trendingRow} viewAllHref="/catalog?sort=popularity" />
        <AnimeRow title="Highest Rated" items={topRated} viewAllHref="/catalog?sort=rating" />

        {romance && romance.length > 0 && (
          <AnimeRow
            title="Best of Romance"
            items={romance}
            viewAllHref="/catalog?genre=romance&sort=popularity"
          />
        )}

        {comedy && comedy.length > 0 && (
          <AnimeRow
            title="Top Comedy"
            items={comedy}
            viewAllHref="/catalog?genre=comedy&sort=popularity"
          />
        )}

        {isekai && isekai.length > 0 && (
          <AnimeRow
            title="Best Isekai"
            items={isekai}
            viewAllHref="/catalog?genre=isekai&sort=popularity"
          />
        )}
      </div>
    </main>
  );
}

