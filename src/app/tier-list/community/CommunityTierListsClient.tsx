"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  Heart, 
  Share2, 
  Copy, 
  ExternalLink, 
  Layers, 
  TrendingUp, 
  Clock, 
  User, 
  Check, 
  ChevronRight,
  Plus
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { useAuth } from "@/providers/AuthProvider";

interface CommunityTierListsClientProps {
  initialLists: any[];
  userUpvotes: string[];
  currentUserId?: string;
}

export default function CommunityTierListsClient({
  initialLists,
  userUpvotes: initialUserUpvotes,
  currentUserId,
}: CommunityTierListsClientProps) {
  const [lists, setLists] = useState<any[]>(initialLists);
  const [upvotedSet, setUpvotedSet] = useState<Set<string>>(new Set(initialUserUpvotes));
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "latest">("popular");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { user, supabase } = useAuth();

  // Upvote / Like Handler with optimistic update
  const handleToggleLike = async (tierListId: string) => {
    if (!user) {
      alert("Please log in to like and upvote community tier lists!");
      return;
    }

    const isAlreadyLiked = upvotedSet.has(tierListId);
    
    // 1. Optimistic state update
    setUpvotedSet((prev) => {
      const next = new Set(prev);
      if (isAlreadyLiked) next.delete(tierListId);
      else next.add(tierListId);
      return next;
    });

    setLists((prev) =>
      prev.map((tl) => {
        if (tl.id === tierListId) {
          const currentCount = tl.likes_count || 0;
          return {
            ...tl,
            likes_count: isAlreadyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        }
        return tl;
      })
    );

    // 2. Sync to Supabase
    try {
      if (isAlreadyLiked) {
        await supabase
          .from("tier_list_likes")
          .delete()
          .match({ tier_list_id: tierListId, user_id: user.id });
      } else {
        await supabase
          .from("tier_list_likes")
          .insert({ tier_list_id: tierListId, user_id: user.id });
      }
    } catch (err) {
      console.error("Failed to sync upvote:", err);
    }
  };

  const handleShare = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/tier-list?id=${encodeURIComponent(id)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered & Sorted Tier Lists
  const filteredLists = useMemo(() => {
    let result = [...lists];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tl) =>
          tl.title?.toLowerCase().includes(q) ||
          tl.username?.toLowerCase().includes(q) ||
          tl.description?.toLowerCase().includes(q)
      );
    }

    if (sortBy === "popular") {
      result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at || b.createdAt || 0).getTime() -
          new Date(a.created_at || a.createdAt || 0).getTime()
      );
    }

    return result;
  }, [lists, searchQuery, sortBy]);

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-900/40 via-blue-900/30 to-slate-900 border border-purple-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" />
              Community Showcase
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Community Tier Lists
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
              Explore, upvote, and clone anime tier lists created by other anime fans. Rank your favorites and share your taste with the world.
            </p>
          </div>

          {/* Action Buttons & Tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/tier-list"
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Create New Tier List
            </Link>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-8 border-t border-white/10 pt-4">
          <Link
            href="/tier-list"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5" />
            Tier List Maker
          </Link>
          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Community Showcase ({lists.length})
          </div>
        </div>
      </div>

      {/* Search & Sorting Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tier lists by title or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSortBy("popular")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              sortBy === "popular"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-slate-950/80 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Most Popular
          </button>
          <button
            onClick={() => setSortBy("latest")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              sortBy === "latest"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-slate-950/80 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Latest
          </button>
        </div>
      </div>

      {/* Community Tier Lists Grid */}
      {filteredLists.length === 0 ? (
        <div className="w-full py-20 rounded-3xl bg-slate-900/40 border border-white/5 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Tier Lists Found</h3>
          <p className="text-xs text-slate-400 max-w-md">
            {searchQuery
              ? `No tier lists matching "${searchQuery}". Try another search term.`
              : "Be the first to publish an anime tier list to the community feed!"}
          </p>
          <Link
            href="/tier-list"
            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
          >
            Create a Tier List
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((tl) => {
            const isUpvoted = upvotedSet.has(tl.id);
            const totalRankedItems = (tl.rows || []).reduce(
              (acc: number, r: any) => acc + (r.items?.length || 0),
              0
            );

            // Preview of top 6 items from S/A rows
            const previewItems: any[] = [];
            for (const r of tl.rows || []) {
              for (const it of r.items || []) {
                if (previewItems.length < 6) {
                  previewItems.push({ item: it, rowLabel: r.label, rowColor: r.color });
                }
              }
            }

            return (
              <div
                key={tl.id}
                className="group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-purple-500/40 transition-all duration-300 flex flex-col overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {tl.title || "My Anime Tier List"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Link
                          href={`/user/${encodeURIComponent(tl.username)}`}
                          className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <User className="w-3 h-3" />
                          @{tl.username}
                        </Link>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[11px] text-slate-400">
                          {totalRankedItems} items ranked
                        </span>
                      </div>
                    </div>

                    {/* Upvote Button */}
                    <button
                      onClick={() => handleToggleLike(tl.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isUpvoted
                          ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-md"
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30"
                      }`}
                      title={isUpvoted ? "Remove Upvote" : "Upvote this tier list"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isUpvoted ? "fill-current" : ""}`} />
                      <span>{tl.likes_count || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Tier Rows Mini Preview */}
                <div className="px-5 py-2">
                  <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-none">
                    {(tl.rows || []).slice(0, 5).map((r: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-black text-slate-950 shrink-0 shadow-sm"
                        style={{ backgroundColor: r.color || "#e2e8f0" }}
                      >
                        {r.label} ({r.items?.length || 0})
                      </span>
                    ))}
                  </div>

                  {/* Top Items Poster Mosaic */}
                  {previewItems.length > 0 ? (
                    <div className="grid grid-cols-6 gap-1.5 rounded-2xl overflow-hidden bg-slate-950 p-2 border border-white/5">
                      {previewItems.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden bg-slate-800"
                          title={p.item.title}
                        >
                          <AnimeImage
                            src={p.item.posterImage}
                            alt={p.item.title}
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 bg-slate-950 rounded-2xl border border-white/5 text-center text-xs text-slate-500">
                      Empty tier list
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-auto p-5 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <button
                    onClick={(e) => handleShare(tl.id, e)}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-colors text-xs flex items-center gap-1.5"
                    title="Copy Share Link"
                  >
                    {copiedId === tl.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[11px]">{copiedId === tl.id ? "Copied!" : "Share"}</span>
                  </button>

                  <Link
                    href={`/tier-list?id=${encodeURIComponent(tl.id)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:scale-105"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>View & Clone</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}