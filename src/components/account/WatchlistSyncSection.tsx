"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ExternalAccountInfo, SyncHistoryEvent, SyncConflictItem } from "@/types/account";
import { SyncJob, SyncConflict } from "@/types/sync";
import {
  RefreshCw,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Sparkles,
  Sliders,
  History,
  Check,
  RotateCcw,
  ListRestart,
  ShieldAlert,
} from "lucide-react";

interface WatchlistSyncSectionProps {
  connections: {
    ANILIST: ExternalAccountInfo | null;
    MYANIMELIST: ExternalAccountInfo | null;
  };
  syncHistory: SyncHistoryEvent[];
  onRefreshData: () => void;
}

export default function WatchlistSyncSection({
  connections,
  syncHistory,
  onRefreshData,
}: WatchlistSyncSectionProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, "use_local" | "use_remote" | "keep_latest">>({});

  // Background queue & conflicts state
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [serverConflicts, setServerConflicts] = useState<SyncConflict[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);

  const anilistConnected = connections?.ANILIST?.status === "CONNECTED";
  const malConnected = connections?.MYANIMELIST?.status === "CONNECTED";
  const hasConnectedService = anilistConnected || malConnected;

  const fetchJobsAndConflicts = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const [jobsRes, conflictsRes] = await Promise.all([
        fetch("/api/account/sync/jobs").catch(() => null),
        fetch("/api/account/sync/conflicts").catch(() => null),
      ]);

      if (jobsRes?.ok) {
        const jData = await jobsRes.json();
        setJobs(jData.jobs || []);
      }
      if (conflictsRes?.ok) {
        const cData = await conflictsRes.json();
        setServerConflicts(cData.conflicts || []);
      }
    } catch {
      // Background fetch error - non-blocking
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobsAndConflicts();
  }, [fetchJobsAndConflicts]);

  const handleSyncEverything = async (overrideResolutions?: Record<string, any>) => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSyncStatusMsg("Evaluating library differences and syncing entries...");

    try {
      const res = await fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "ALL",
          resolutions: overrideResolutions || resolutions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute sync.");

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        setShowConflictModal(true);
        setSyncStatusMsg(`Found ${data.conflicts.length} entries with differing progress.`);
      } else {
        setSyncStatusMsg(data.message || "Sync completed successfully!");
        setShowConflictModal(false);
        setConflicts([]);
      }

      onRefreshData();
      fetchJobsAndConflicts();
    } catch (err: any) {
      setErrorMsg(err.message || "Sync execution error.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await fetch("/api/account/sync/jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry job");
      await fetchJobsAndConflicts();
    } catch (err: any) {
      setErrorMsg(err.message || "Retry failed.");
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleResolveServerConflict = async (conflictId: string, policy: "use_local" | "use_remote") => {
    setResolvingConflictId(conflictId);
    try {
      const res = await fetch("/api/account/sync/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, resolutionPolicy: policy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve conflict");
      setServerConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Resolution error.");
    } finally {
      setResolvingConflictId(null);
    }
  };

  const handleResolveConflict = (slug: string, choice: "use_local" | "use_remote" | "keep_latest") => {
    setResolutions((prev) => ({
      ...prev,
      [slug]: choice,
    }));
  };

  const handleApplyResolutions = () => {
    handleSyncEverything(resolutions);
  };

  const formatLastSynced = (dateStr?: string | null) => {
    if (!dateStr) return "Never synced";
    const d = new Date(dateStr);
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-400" />
          Watchlist &amp; Progress Sync
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Synchronize watch progress, statuses, and ratings across your AniWaveX account and external services.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncStatusMsg && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-blue-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* ── Active Sync Overview Card ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Sync Integrations
            </span>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <div
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex flex-col gap-0.5 ${
                  anilistConnected
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                    : "bg-slate-800 text-slate-500 border-white/5"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>AniWaveX ↔ AniList</span>
                  {anilistConnected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                {anilistConnected && (
                  <span className="text-[10px] font-medium text-slate-400">
                    Synced: {formatLastSynced(connections?.ANILIST?.last_synced_at)}
                  </span>
                )}
              </div>

              <div
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex flex-col gap-0.5 ${
                  malConnected
                    ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
                    : "bg-slate-800 text-slate-500 border-white/5"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>AniWaveX ↔ MyAnimeList</span>
                  {malConnected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                {malConnected && (
                  <span className="text-[10px] font-medium text-slate-400">
                    Synced: {formatLastSynced(connections?.MYANIMELIST?.last_synced_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSyncEverything()}
            disabled={isSyncing || !hasConnectedService}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing Libraries...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sync Everything Now</span>
              </>
            )}
          </button>
        </div>

        {/* Sync Direction & Settings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
              Live Playback Sync
            </span>
            <p className="text-slate-400">Episodes automatically sync to AniList &amp; MAL at 88% completion.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Synced Fields
            </span>
            <p className="text-slate-400">Watch status, episode counts, scores, and plan to watch.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Conflict Guard
            </span>
            <p className="text-slate-400">External higher episode counts trigger conflict review.</p>
          </div>
        </div>
      </div>

      {/* ── Unresolved Conflicts Section (If Any) ── */}
      {serverConflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Detected Progress Conflicts ({serverConflicts.length})
          </h3>

          <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {serverConflicts.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white">{c.anime_title || c.anime_slug}</p>
                  <div className="flex items-center gap-3 mt-1 text-slate-400 text-[11px]">
                    <span className="text-blue-400 font-semibold">AniWaveX: Ep {c.local_progress}</span>
                    {c.anilist_progress !== undefined && (
                      <span className="text-purple-400">AniList: Ep {c.anilist_progress}</span>
                    )}
                    {c.mal_progress !== undefined && (
                      <span className="text-indigo-400">MAL: Ep {c.mal_progress}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={resolvingConflictId === c.id}
                    onClick={() => handleResolveServerConflict(c.id, "use_local")}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    Use Local (Ep {c.local_progress})
                  </button>
                  <button
                    type="button"
                    disabled={resolvingConflictId === c.id}
                    onClick={() => handleResolveServerConflict(c.id, "use_remote")}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    Use Tracker Ep
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Live Playback Sync Queue (sync_jobs) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ListRestart className="w-4 h-4 text-indigo-400" />
            Live Playback Sync Jobs ({jobs.length})
          </h3>
          <button
            type="button"
            onClick={fetchJobsAndConflicts}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingJobs ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-500">
            No live playback sync jobs queued yet. Watch an episode up to 88% to see real-time updates.
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {jobs.slice(0, 10).map((job) => {
              const statusPill = {
                SUCCESS: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Completed" },
                PROCESSING: { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Syncing..." },
                PENDING: { bg: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Pending" },
                RETRYING: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: `Retrying (${job.attempts}/${job.max_attempts})` },
                FAILED: { bg: "bg-red-500/10 text-red-400 border-red-500/20", label: "Failed" },
                REAUTH_REQUIRED: { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "Reauth Needed" },
              }[job.status] || { bg: "bg-slate-800 text-slate-400 border-white/5", label: job.status };

              return (
                <div key={job.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        job.status === "SUCCESS"
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : job.status === "RETRYING"
                          ? "bg-amber-400"
                          : job.status === "FAILED"
                          ? "bg-red-400"
                          : "bg-blue-400 animate-pulse"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">
                          {job.anime_title || job.anime_slug} &middot; Ep {job.episode_number}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusPill.bg}`}>
                          {statusPill.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {job.provider === "ANILIST" ? "AniList" : "MyAnimeList"} &middot; {job.error || "Updated in background"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {job.status === "FAILED" && (
                      <button
                        type="button"
                        disabled={retryingJobId === job.id}
                        onClick={() => handleRetryJob(job.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-medium flex items-center gap-1 border border-amber-500/20 transition-colors"
                      >
                        {retryingJobId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Retry
                      </button>
                    )}
                    <span className="text-[11px] text-slate-500">
                      {new Date(job.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sync History Timeline ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          Recent Sync History ({syncHistory.length})
        </h3>

        {syncHistory.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-500">
            No synchronization history recorded yet. Connect an account and click &quot;Sync Everything Now&quot;.
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {syncHistory.slice(0, 10).map((event) => (
              <div key={event.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      event.status === "SUCCESS"
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : event.status === "CONFLICT"
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-white">
                      {event.provider} {event.status === "SUCCESS" ? "Synchronized" : event.status}
                    </p>
                    <p className="text-[11px] text-slate-400">{event.summary || "Library updated"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500">
                    {new Date(event.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sync Conflict Modal (Bulk Sync) ── */}
      {showConflictModal && conflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Resolve Sync Conflicts ({conflicts.length})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                We detected conflicting watch progress between AniWaveX and your connected anime trackers. Choose which version to keep.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {conflicts.map((item) => {
                const choice = resolutions[item.id] || "keep_latest";
                return (
                  <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                      {item.poster_image && (
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                          <Image src={item.poster_image} alt={item.title} fill unoptimized className="object-cover" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-xs sm:text-sm">{item.title}</h4>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="text-blue-400">
                            AniWaveX: <strong>Ep {item.local_episode}</strong> ({item.local_status})
                          </span>
                          <span className="text-purple-400">
                            {item.provider}: <strong>Ep {item.remote_episode}</strong> ({item.remote_status})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, "use_local")}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          choice === "use_local"
                            ? "bg-blue-600 text-white border-blue-500 shadow-md"
                            : "bg-slate-900 text-slate-300 border-white/10 hover:border-white/20"
                        }`}
                      >
                        Use AniWaveX
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, "use_remote")}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          choice === "use_remote"
                            ? "bg-purple-600 text-white border-purple-500 shadow-md"
                            : "bg-slate-900 text-slate-300 border-white/10 hover:border-white/20"
                        }`}
                      >
                        Use {item.provider === "ANILIST" ? "AniList" : "MAL"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveConflict(item.id, "keep_latest")}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          choice === "keep_latest"
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                            : "bg-slate-900 text-slate-300 border-white/10 hover:border-white/20"
                        }`}
                      >
                        Keep Highest Ep
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
              >
                Decide Later
              </button>
              <button
                type="button"
                onClick={handleApplyResolutions}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Apply Resolutions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
