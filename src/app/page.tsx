import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import PersonalizedRecommendationsRow from "@/components/PersonalizedRecommendationsRow";
import ApkHomeSections from "@/components/ApkHomeSections";
import { getTrendingAnime, getTopRatedAnime, getGenreAnime } from "@/lib/api";

export default async function Home() {
  const [trending, topRated, romance, comedy, isekai] = await Promise.all([
    getTrendingAnime(),
    getTopRatedAnime(),
    getGenreAnime("romance", 12),
    getGenreAnime("comedy", 12),
    getGenreAnime("isekai", 12),
  ]);

  // Use top 5 trending anime for the hero slider
  const heroAnimeList = trending.slice(0, 5);
  // The rest for the trending row
  const trendingRow = trending.slice(5);

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <HeroSlider animeList={heroAnimeList} />
        
        <ContinueWatchingRow />

        {/* Dynamic Client-Side Personalized Recommendations */}
        <PersonalizedRecommendationsRow candidatePool={[...trending, ...topRated, ...romance, ...comedy, ...isekai]} />

        <AnimeRow title="Trending Now" items={trendingRow} viewAllHref="/catalog?sort=trending" />
        <AnimeRow title="Highest Rated" items={topRated} viewAllHref="/catalog?sort=rated" />

        {/* Extra discovery rows rendered exclusively inside the APK */}
        <ApkHomeSections
          romance={romance}
          comedy={comedy}
          isekai={isekai}
        />
      </div>
    </main>
  );
}

