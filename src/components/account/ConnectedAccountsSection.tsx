"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalAccountInfo } from "@/types/account";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Loader2,
  Sliders,
  X,
} from "lucide-react";

interface ConnectedAccountsSectionProps {
  connections: {
    ANILIST: ExternalAccountInfo | null;
    MYANIMELIST: ExternalAccountInfo | null;
  };
  onRefreshConnections: () => void;
  onTriggerSync: (provider: "ANILIST" | "MYANIMELIST") => void;
}

export default function ConnectedAccountsSection({
  connections,
  onRefreshConnections,
  onTriggerSync,
}: ConnectedAccountsSectionProps) {
  const [connectingProvider, setConnectingProvider] = useState<"ANILIST" | "MYANIMELIST" | null>(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState<ExternalAccountInfo | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [managingAccount, setManagingAccount] = useState<ExternalAccountInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const anilistAccount = connections?.ANILIST;
  const malAccount = connections?.MYANIMELIST;

  // Initiate real OAuth authorization flow
  const handleConnect = async (provider: "ANILIST" | "MYANIMELIST") => {
    setConnectingProvider(provider);
    setErrorMessage(null);
    try {
      const endpoint =
        provider === "ANILIST"
          ? "/api/account/connections/anilist/start"
          : "/api/account/connections/mal/start";

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || `Failed to initiate ${provider} connection.`);
      }

      // Redirect browser directly to official provider authorization screen
      window.location.href = data.url;
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start authorization.");
      setConnectingProvider(null);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectingAccount) return;
    setIsDisconnecting(true);
    setErrorMessage(null);

    try {
      const endpoint =
        disconnectingAccount.provider === "ANILIST"
          ? "/api/account/connections/anilist"
          : "/api/account/connections/mal";

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to disconnect account.");

      setDisconnectingAccount(null);
      onRefreshConnections();
    } catch (err: any) {
      setErrorMessage(err.message || "Disconnect failed.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUpdateSyncSettings = async (settings: any) => {
    if (!managingAccount) return;
    try {
      const endpoint =
        managingAccount.provider === "ANILIST"
          ? "/api/account/connections/anilist"
          : "/api/account/connections/mal";

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_settings: settings }),
      });

      setManagingAccount(null);
      onRefreshConnections();
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const formatLastSync = (dateStr?: string | null) => {
    if (!dateStr) return "Never synchronized";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          Connected Accounts
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Connect your anime tracking services to seamlessly sync your watchlist, episode progress, and ratings.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── AniList Card ── */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            {/* Header / Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-black text-lg shadow-md">
                  AL
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">AniList</h3>
                  <p className="text-xs text-slate-400">GraphQL 2-Way Sync</p>
                </div>
              </div>

              {/* Status Badge */}
              {anilistAccount?.status === "CONNECTED" ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : anilistAccount?.status === "REAUTH_REQUIRED" ? (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Re-auth Required
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-white/5 rounded-xl text-xs font-bold">
                  Not Connected
                </span>
              )}
            </div>

            {/* Details */}
            {anilistAccount?.status === "CONNECTED" ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Handle:</span>
                  <span className="font-bold text-white font-mono">@{anilistAccount.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AniList ID:</span>
                  <span className="font-mono text-slate-300">{anilistAccount.provider_user_id}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">Last Synchronized:</span>
                  <span className="text-blue-400 font-semibold">{formatLastSync(anilistAccount.last_synced_at)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed p-3 bg-blue-950/20 border border-blue-500/10 rounded-2xl">
                Connect your AniList account with official OAuth authorization to synchronize anime progress automatically as you watch.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-5 border-t border-white/5 mt-4">
            {anilistAccount?.status === "CONNECTED" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTriggerSync("ANILIST")}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={() => setManagingAccount(anilistAccount)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => setDisconnectingAccount(anilistAccount)}
                  className="py-2.5 px-3 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect("ANILIST")}
                disabled={connectingProvider === "ANILIST"}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {connectingProvider === "ANILIST" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting AniList...</span>
                  </>
                ) : (
                  <>
                    <span>Connect AniList</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── MyAnimeList Card ── */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            {/* Header / Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-black text-lg shadow-md">
                  MAL
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">MyAnimeList</h3>
                  <p className="text-xs text-slate-400">OAuth 2.0 PKCE Sync</p>
                </div>
              </div>

              {/* Status Badge */}
              {malAccount?.status === "CONNECTED" ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : malAccount?.status === "REAUTH_REQUIRED" ? (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Re-auth Required
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-white/5 rounded-xl text-xs font-bold">
                  Not Connected
                </span>
              )}
            </div>

            {/* Details */}
            {malAccount?.status === "CONNECTED" ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Handle:</span>
                  <span className="font-bold text-white font-mono">@{malAccount.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">MAL User ID:</span>
                  <span className="font-mono text-slate-300">{malAccount.provider_user_id}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">Last Synchronized:</span>
                  <span className="text-indigo-400 font-semibold">{formatLastSync(malAccount.last_synced_at)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl">
                Securely connect your MyAnimeList account via PKCE authorization code exchange. Zero manual token copying required!
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-5 border-t border-white/5 mt-4">
            {malAccount?.status === "CONNECTED" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTriggerSync("MYANIMELIST")}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={() => setManagingAccount(malAccount)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => setDisconnectingAccount(malAccount)}
                  className="py-2.5 px-3 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect("MYANIMELIST")}
                disabled={connectingProvider === "MYANIMELIST"}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {connectingProvider === "MYANIMELIST" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting MyAnimeList...</span>
                  </>
                ) : (
                  <>
                    <span>Connect MyAnimeList</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Disconnect Confirmation Modal ── */}
      {disconnectingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Disconnect {disconnectingAccount.provider === "ANILIST" ? "AniList" : "MyAnimeList"}?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will stop automatic progress syncing with{" "}
              <strong className="text-white">@{disconnectingAccount.username}</strong>. Your existing AniWaveX watchlist and external anime entries will remain intact.
            </p>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDisconnectingAccount(null)}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Disconnect Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Sync Settings Modal ── */}
      {managingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-base">
                {managingAccount.provider === "ANILIST" ? "AniList" : "MyAnimeList"} Preferences
              </h3>
              <button
                type="button"
                onClick={() => setManagingAccount(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-white/5 cursor-pointer">
                <span className="text-slate-200 font-semibold">Sync Watch Status</span>
                <input
                  type="checkbox"
                  defaultChecked={managingAccount.sync_settings?.sync_status ?? true}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-white/5 cursor-pointer">
                <span className="text-slate-200 font-semibold">Sync Episode Progress</span>
                <input
                  type="checkbox"
                  defaultChecked={managingAccount.sync_settings?.sync_progress ?? true}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-white/5 cursor-pointer">
                <span className="text-slate-200 font-semibold">Sync Scores &amp; Ratings</span>
                <input
                  type="checkbox"
                  defaultChecked={managingAccount.sync_settings?.sync_scores ?? true}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingAccount(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
