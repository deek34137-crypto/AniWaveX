"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Activity, 
  Users, 
  Calendar, 
  Globe, 
  X, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Eye,
  Radio,
  BarChart3
} from "lucide-react";

interface AnalyticsData {
  concurrentUsers: number;
  dailyUniqueUsers: number;
  totalUniqueUsers: number;
  topPages?: { current_path: string; active_count: number }[];
  dailyTrend?: { date: string; unique_users: number }[];
  serverTime?: string;
}

export default function AnalyticsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/heartbeat", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 403) {
        setErrorMsg("Admin authorization required to view live heartbeat telemetry.");
      } else {
        setErrorMsg("Failed to load statistics.");
      }
    } catch (err) {
      console.error("Failed to fetch heartbeat stats:", err);
      setErrorMsg("Network error connecting to telemetry server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, fetchStats]);

  // Auto refresh every 10 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, [isOpen, autoRefresh, fetchStats]);

  if (!isOpen) return null;

  const maxTrendVal = data?.dailyTrend && data.dailyTrend.length > 0 
    ? Math.max(...data.dailyTrend.map(d => d.unique_users), 5) 
    : 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Live Heartbeat &amp; Traffic Stats
              </h2>
              <p className="text-xs text-slate-400">
                Real-time concurrent users, daily unique visitors, and active page metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStats()}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-white/10"
              title="Refresh Stats"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Concurrent Users Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/40 to-slate-900 p-4 rounded-2xl border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Concurrent Live
                </span>
                <Radio className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data?.concurrentUsers ?? (isLoading ? "..." : 1)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active right now (last 2m)</p>
            </div>

            {/* Daily Unique Users Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-950/40 to-slate-900 p-4 rounded-2xl border border-blue-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-2">
                <span>Daily Unique (DAU)</span>
                <Calendar className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data?.dailyUniqueUsers ?? (isLoading ? "..." : 1)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Unique visitors today</p>
            </div>

            {/* Total Unique Users Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-950/40 to-slate-900 p-4 rounded-2xl border border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-2">
                <span>Total Unique Users</span>
                <Users className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data?.totalUniqueUsers ?? (isLoading ? "..." : 1)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">All-time unique visitors</p>
            </div>
          </div>

          {/* Top Active Pages Right Now */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Active Pages Right Now
            </h3>
            {data?.topPages && data.topPages.length > 0 ? (
              <div className="space-y-2">
                {data.topPages.map((pg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs"
                  >
                    <span className="font-mono text-slate-300 truncate max-w-[320px] sm:max-w-[420px]">
                      {pg.current_path}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 shrink-0">
                      {pg.active_count} active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No page distribution recorded yet.</p>
            )}
          </div>

          {/* 7-Day Daily Unique User Trend */}
          {data?.dailyTrend && data.dailyTrend.length > 0 && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                7-Day Daily Unique Visitors Trend
              </h3>
              <div className="flex items-end gap-3 h-28 pt-4 px-2">
                {data.dailyTrend.map((d, idx) => {
                  const heightPct = Math.max(15, Math.round((d.unique_users / maxTrendVal) * 100));
                  const dateLabel = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        {d.unique_users}
                      </span>
                      <div
                        className="w-full bg-indigo-600 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-400 shadow-md"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] text-slate-400 font-medium">{dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span>Auto-refresh every 10s</span>
          </label>
          <span className="text-[11px] text-slate-500">
            Powered by AniWaveX Heartbeat Engine
          </span>
        </div>
      </div>
    </div>
  );
}
