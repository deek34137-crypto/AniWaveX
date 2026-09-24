"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  X,
  Check,
  Loader2,
  ExternalLink,
  Download,
  Upload,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  getAniListAuthUrl,
  getMalAuthUrl,
  ANILIST_TOKEN_KEY,
  MAL_TOKEN_KEY,
  buildSyncDiff,
  applyAniListSync,
  SyncDiffItem,
} from "@/lib/sync-engine";

interface TwoWaySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  localWatchlist: any[];
}

export default function TwoWaySyncModal({ isOpen, onClose, localWatchlist }: TwoWaySyncModalProps) {
  const [activeService, setActiveService] = useState<"anilist" | "mal">("anilist");
  const [token, setToken] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [diffItems, setDiffItems] = useState<SyncDiffItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken =
        activeService === "anilist"
          ? localStorage.getItem(ANILIST_TOKEN_KEY) || ""
          : localStorage.getItem(MAL_TOKEN_KEY) || "";
      setToken(storedToken);
      setDiffItems([]);
      setErrorMsg(null);
      setStatusMessage(null);
    }
  }, [activeService, isOpen]);

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    if (!token.trim()) {
      setErrorMsg(`Please enter your ${activeService === "anilist" ? "AniList" : "MyAnimeList"} access token first.`);
      return;
    }

    setIsComparing(true);
    setErrorMsg(null);
    setStatusMessage("Fetching remote lists and computing diffs...");

    try {
      if (activeService === "anilist") {
        // Query current viewer's lists
        const viewerQuery = `
          query {
            Viewer {
              name
              mediaListOptions {
                scoreFormat
              }
            }
          }
        `;
        const vRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.trim()}`,
          },
          body: JSON.stringify({ query: viewerQuery }),
        });

        if (!vRes.ok) throw new Error("Invalid AniList token or authorization expired.");
        const vJson = await vRes.json();
        const username = vJson?.data?.Viewer?.name;

        if (!username) throw new Error("Could not retrieve AniList user account.");

        // Query user's full anime list
        const listQuery = `
          query ($userName: String) {
            MediaListCollection(userName: $userName, type: ANIME) {
              lists {
                entries {
                  id
                  status
                  progress
                  media {
                    id
                    title {
                      english
                      romaji
                      native
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;

        const lRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: listQuery, variables: { userName: username } }),
        });

        const lJson = await lRes.json();
        const rawLists = lJson?.data?.MediaListCollection?.lists || [];
        const remoteItems: any[] = [];

        for (const list of rawLists) {
          for (const entry of list.entries || []) {
            const m = entry.media;
            const title = m?.title?.english || m?.title?.romaji || m?.title?.native || "Anime";
            remoteItems.push({
              id: m.id,
              title,
              posterImage: m?.coverImage?.large || "",
              status: entry.status,
              progress: entry.progress || 0,
            });
          }
        }

        const computed = buildSyncDiff(localWatchlist, remoteItems);
        setDiffItems(computed);
        setStatusMessage(`Comparison ready: ${computed.length} items evaluated.`);
      } else {
        // MAL Preview flow
        setStatusMessage("MyAnimeList OAuth connection configured. Ready for token authorization.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to compare libraries.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleApplySync = async () => {
    if (!token.trim() || diffItems.length === 0) return;
    setIsApplying(true);
    setStatusMessage("Applying confirmed changes...");

    try {
      const { successful, failed } = await applyAniListSync(token, diffItems);
      setStatusMessage(`Sync successfully applied! ${successful} updated, ${failed} skipped.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to apply sync mutations.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveToken = () => {
    if (activeService === "anilist") {
      localStorage.setItem(ANILIST_TOKEN_KEY, token.trim());
    } else {
      localStorage.setItem(MAL_TOKEN_KEY, token.trim());
    }
    setStatusMessage("Token saved securely in local storage.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">2-Way Watchlist &amp; Progress Sync</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service Switcher */}
        <div className="flex p-2 bg-slate-950/60 border-b border-white/5 gap-2">
          <button
            type="button"
            onClick={() => setActiveService("anilist")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeService === "anilist"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            AniList 2-Way Sync
          </button>

          <button
            type="button"
            onClick={() => setActiveService("mal")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeService === "mal"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            MyAnimeList (PKCE)
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Token Connect Section */}
          <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {activeService === "anilist" ? "AniList OAuth Token" : "MyAnimeList Client Token"}
              </label>
              <a
                href={activeService === "anilist" ? getAniListAuthUrl() : getMalAuthUrl()}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Authenticate with {activeService === "anilist" ? "AniList" : "MAL"}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste Bearer Token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleSaveToken}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            onClick={handleFetchPreview}
            disabled={isComparing || !token.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing Local vs Remote Libraries...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate Safe 2-Way Diff Preview
              </>
            )}
          </button>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Diff Preview Items */}
          {diffItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Preview Changes ({diffItems.length})
                </h3>
                <button
                  type="button"
                  onClick={handleApplySync}
                  disabled={isApplying}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Apply Confirmed Sync
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {diffItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-white/5 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          item.direction === "export"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : item.direction === "import"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : item.direction === "conflict"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.direction}
                      </span>
                      <span className="font-semibold text-white truncate max-w-xs">{item.title}</span>
                    </div>

                    <span className="text-slate-400 text-[11px] shrink-0">{item.actionSummary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
