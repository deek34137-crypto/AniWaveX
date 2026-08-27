"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Activity, 
  Users, 
  Calendar, 
  Globe, 
  RotateCcw, 
  Radio, 
  BarChart3, 
  TrendingUp, 
  Sparkles 
} from "lucide-react";

interface AnalyticsData {
  concurrentUsers: number;
  dailyUniqueUsers: number;
  totalUniqueUsers: number;
  topPages?: { current_path: string; active_count: number }[];
  dailyTrend?: { date: string; unique_users: number }[];
  serverTime?: string;
}

interface DayTrendItem {
  date: string;
  label: string;
  count: number;
}

export default function AnalyticsPageClient({
  initialIsAdmin = false,
  userEmail = null,
}: {
  initialIsAdmin?: boolean;
  userEmail?: string | null;
}) {
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const fetchStats = useCallback(async (keyOverride?: string) => {
    try {
      setIsLoading(true);
      const url = keyOverride ? `/api/heartbeat?key=${encodeURIComponent(keyOverride)}` : "/api/heartbeat";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsAdmin(true);
        setPasscodeError(false);
      } else if (res.status === 403) {
        setIsAdmin(false);
        if (keyOverride) setPasscodeError(true);
      }
    } catch (err) {
      console.error("Failed to fetch heartbeat stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const timer = setInterval(() => fetchStats(), 10000);
    return () => clearInterval(timer);
  }, [isAdmin, autoRefresh, fetchStats]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Activity className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-slate-400 text-sm">
            {userEmail
              ? `You are signed in as ${userEmail}, which does not have admin privileges.`
              : "Please sign in with an authorized admin account to view live audience heartbeat stats."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (passcode.trim()) {
              fetchStats(passcode.trim());
            }
          }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl"
        >
          <div className="text-left">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Or Enter Admin Key / Passcode:
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Admin secret..."
              className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            />
            {passcodeError && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">
                Invalid admin key or unauthorized.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !passcode.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
          >
            {isLoading ? "Verifying..." : "Unlock Analytics"}
          </button>
        </form>
      </div>
    );
  }

  // Generate complete 7-day dates list with zero-fill so chart always displays 7 vertical day bars
  const full7DayTrend = useMemo<DayTrendItem[]>(() => {
    const days: DayTrendItem[] = [];
    const trendMap = new Map<string, number>();
    (data?.dailyTrend || []).forEach((d: { date: string; unique_users: number }) => {
      const dateKey = typeof d.date === "string" ? d.date.split("T")[0] : "";
      if (dateKey) trendMap.set(dateKey, d.unique_users || 0);
    });

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({
        date: iso,
        label,
        count: trendMap.get(iso) || (i === 0 ? data?.dailyUniqueUsers || 1 : 0),
      });
    }
    return days;
  }, [data?.dailyTrend, data?.dailyUniqueUsers]);

  const maxTrendVal = Math.max(...full7DayTrend.map((d: DayTrendItem) => d.count), 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/40 border border-emerald-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-2">
              <Activity className="w-4 h-4 animate-pulse" />
              Live Telemetry &amp; Visitor Heartbeat
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
              Audience Analytics
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Track live concurrent active users, daily unique visitors (DAU), and all-time audience growth in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 shadow-lg hover:scale-105"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 rounded-2xl border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Auto-refresh (10s)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Concurrent Users Card */}
        <div className="relative overflow-hidden bg-slate-900/90 p-6 rounded-3xl border border-emerald-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-4">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Concurrent Active Users
            </span>
            <Radio className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
            {data?.concurrentUsers ?? (isLoading ? "..." : 1)}
          </div>
          <p className="text-xs text-slate-400">Active on the site within the last 2 minutes</p>
        </div>

        {/* Daily Unique Users Card */}
        <div className="relative overflow-hidden bg-slate-900/90 p-6 rounded-3xl border border-blue-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-4">
            <span>Daily Unique Users (DAU)</span>
            <Calendar className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
            {data?.dailyUniqueUsers ?? (isLoading ? "..." : 1)}
          </div>
          <p className="text-xs text-slate-400">Unique visitors recorded today</p>
        </div>

        {/* Total Unique Users Card */}
        <div className="relative overflow-hidden bg-slate-900/90 p-6 rounded-3xl border border-purple-500/30 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-4">
            <span>Total Unique Visitors</span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
            {data?.totalUniqueUsers ?? (isLoading ? "..." : 1)}
          </div>
          <p className="text-xs text-slate-400">All-time unique visitors across the platform</p>
        </div>
      </div>

      {/* Grid Layout: Active Pages & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Pages Right Now */}
        <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 shadow-xl">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Top Active Routes Right Now
          </h2>
          {data?.topPages && data.topPages.length > 0 ? (
            <div className="space-y-3">
              {data.topPages.map((pg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 text-xs"
                >
                  <span className="font-mono text-slate-300 truncate max-w-[240px] sm:max-w-[340px]">
                    {pg.current_path}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 shrink-0">
                    {pg.active_count} online
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              No route distribution recorded yet.
            </p>
          )}
        </div>

        {/* 7-Day Daily Unique Visitor Trend */}
        <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            7-Day Daily Unique Visitors Trend
          </h2>
          <div className="flex items-end justify-between gap-2 h-48 pt-6 px-3">
            {full7DayTrend.map((d: DayTrendItem, idx: number) => {
              const heightPct = Math.max(12, Math.round((d.count / maxTrendVal) * 100));
              const isToday = idx === full7DayTrend.length - 1;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold">
                    {d.count}
                  </span>
                  <div
                    className={`w-9 sm:w-12 max-w-[48px] rounded-t-xl transition-all duration-500 shadow-lg ${
                      isToday
                        ? "bg-gradient-to-t from-blue-600 to-cyan-400 shadow-blue-500/30"
                        : "bg-gradient-to-t from-indigo-700 to-indigo-500 group-hover:from-indigo-600 group-hover:to-indigo-400 shadow-indigo-600/20"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className={`text-[11px] font-semibold ${isToday ? "text-cyan-400" : "text-slate-400"}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
