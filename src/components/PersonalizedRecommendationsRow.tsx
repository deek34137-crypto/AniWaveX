"use client";

import React, { useState, useEffect } from "react";
import AnimeCard from "@/components/AnimeCard";
import { Sparkles, ThumbsUp, ThumbsDown, EyeOff, RotateCcw } from "lucide-react";
import {
  buildTasteProfile,
  rankRecommendations,
  saveRecommendationFeedback,
  clearRecommendationFeedback,
  RecommendationItem,
} from "@/lib/recommendations";

export default function PersonalizedRecommendationsRow({ candidatePool }: { candidatePool: any[] }) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load local watch history and bookmarks/watchlist
    let localHistory: any[] = [];
    let localWatchlist: any[] = [];

    try {
      localHistory = JSON.parse(localStorage.getItem("aniwavex_watch_history") || "[]");
    } catch {}

    try {
      localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
    } catch {}

    // Excluded IDs
    const excluded = new Set<string | number>();
    for (const h of localHistory) {
      if (h.anime_id) excluded.add(h.anime_id);
      if (h.slug) excluded.add(h.slug);
    }
    for (const w of localWatchlist) {
      if (w.anime_slug) excluded.add(w.anime_slug);
      if (w.id) excluded.add(w.id);
    }

    const tasteProfile = buildTasteProfile(localHistory, localWatchlist);
    const ranked = rankRecommendations(candidatePool, tasteProfile, excluded);
    setRecommendations(ranked.slice(0, 12));
    setIsReady(true);
  }, [candidatePool]);

  if (!isReady || recommendations.length === 0) {
    return null;
  }

  const handleFeedback = (
    e: React.MouseEvent,
    animeId: string | number,
    action: "like" | "dislike" | "hide" | "already_watched"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    saveRecommendationFeedback(animeId, action);
    setFeedbackState((prev) => ({ ...prev, [String(animeId)]: action }));

    if (action === "hide" || action === "dislike" || action === "already_watched") {
      setRecommendations((prev) => prev.filter((r) => String(r.id) !== String(animeId)));
    }
  };

  const handleReset = () => {
    clearRecommendationFeedback();
    setFeedbackState({});
    window.location.reload();
  };

  return (
    <section className="my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Recommended for You
            </h2>
            <p className="text-xs text-slate-400">
              Personalized based on your genres, watch history &amp; watchlist
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          title="Reset recommendation feedback"
        >
          <RotateCcw className="w-3 h-3" />
          Reset preferences
        </button>
      </div>

      {/* Recommendations Carousel / Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-3 px-3 sm:-mx-6 sm:px-6">
        {recommendations.map((item) => (
          <div key={item.id} className="w-36 sm:w-44 shrink-0 flex flex-col justify-between group">
            <AnimeCard
              anime={{
                id: item.id,
                slug: item.slug,
                title: item.title,
                posterImage: item.posterImage,
                rating: item.rating,
                year: item.year,
              }}
              sizes="176px"
            />

            {/* Explainable match reason badge */}
            <div className="mt-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-white/5 text-[10px] text-slate-400">
              <span className="font-semibold text-cyan-400 block truncate">{item.score}% match</span>
              <span className="line-clamp-1 text-[9px] text-slate-400">{item.reasons[0]}</span>

              {/* Feedback action icons */}
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={(e) => handleFeedback(e, item.id, "like")}
                  className={`p-1 rounded hover:bg-white/10 ${
                    feedbackState[String(item.id)] === "like" ? "text-emerald-400" : "text-slate-400"
                  }`}
                  title="More like this"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleFeedback(e, item.id, "dislike")}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
                  title="Not interested"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleFeedback(e, item.id, "already_watched")}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-amber-400"
                  title="Already watched"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
