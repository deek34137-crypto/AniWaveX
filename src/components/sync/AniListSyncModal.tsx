"use client";

import { useState } from "react";
import { 
  RefreshCw, 
  X, 
  Check, 
  Loader2, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  Key, 
  User 
} from "lucide-react";
import { fetchUserAniListWatchlist } from "@/lib/sync/anilist-sync";
import { useAuth } from "@/providers/AuthProvider";

interface AniListSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

export default function AniListSyncModal({
  isOpen,
  onClose,
  onImportComplete,
}: AniListSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "token">("import");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("anilist_token") || "";
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, supabase } = useAuth();

  if (!isOpen) return null;

  const handleImportWatchlist = async () => {
    if (!username.trim()) {
      setErrorMsg("Please enter your AniList username.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setImportStatus("Connecting to AniList GraphQL...");

    try {
      const items = await fetchUserAniListWatchlist(username.trim());
      if (!items || items.length === 0) {
        setErrorMsg("No public anime entries found for this AniList username.");
        setIsLoading(false);
        setImportStatus(null);
        return;
      }

      setImportStatus(`Importing ${items.length} anime into your watchlist...`);

      // 1. Sync to localStorage
      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        const map = new Map<string, any>();
        localWatchlist.forEach((item: any) => {
          if (item?.anime_slug) map.set(item.anime_slug, item);
        });
        items.forEach((item) => {
          map.set(item.anime_slug, item);
        });
        localStorage.setItem("aniwavex_watchlist", JSON.stringify(Array.from(map.values())));
      } catch {}

      // 2. Sync to Supabase if logged in
      if (user) {
        const payload = items.map((item) => ({
          user_id: user.id,
          anime_slug: item.anime_slug,
          anime_title: item.anime_title,
          poster_image: item.poster_image,
          status: item.status,
          updated_at: new Date().toISOString(),
        }));

        await supabase.from("bookmarks").upsert(payload, { onConflict: "user_id,anime_slug" });
      }

      setImportStatus(`Successfully imported ${items.length} anime!`);
      if (onImportComplete) onImportComplete(items.length);
      setTimeout(() => {
        setIsLoading(false);
        setImportStatus(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("AniList import error:", err);
      setErrorMsg(err.message || "Failed to import from AniList.");
      setIsLoading(false);
      setImportStatus(null);
    }
  };

  const handleSaveToken = () => {
    try {
      localStorage.setItem("anilist_token", token.trim());
      setImportStatus("AniList Token saved securely in your browser!");
      setTimeout(() => setImportStatus(null), 3000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/60 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AniList Watchlist Sync
              </h3>
              <p className="text-xs text-slate-400">
                1-Click import &amp; automatic episode tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-slate-950/50 p-1.5 gap-1.5 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("import");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "import"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            1-Click Import
          </button>

          <button
            onClick={() => {
              setActiveTab("token");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "token"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Live Auto-Sync
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === "import" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300 leading-relaxed">
                Enter your public AniList username to import your entire Watching, Completed, and Plan to Watch anime library directly into AniWaveX.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  AniList Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. your_anilist_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {importStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              <button
                onClick={handleImportWatchlist}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing Library...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Start 1-Click Import</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
                Connect your AniList API Token to automatically sync watched episode numbers directly back to AniList as you stream episodes on AniWaveX.
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    AniList Access Token
                  </label>
                  <a
                    href="https://anilist.co/settings/developer"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Get Token from AniList
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="Paste AniList Bearer token here..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              <button
                onClick={handleSaveToken}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Save Token for Auto-Sync</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}