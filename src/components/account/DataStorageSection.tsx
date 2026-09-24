"use client";

import { useState } from "react";
import { Database, Download, Trash2, HardDrive, Check, Loader2, AlertCircle } from "lucide-react";

export default function DataStorageSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [localDataCleared, setLocalDataCleared] = useState(false);

  const handleClearImageCache = async () => {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error("Failed to clear browser cache:", err);
    }
  };

  const handleClearLocalData = () => {
    if (!confirm("This will clear temporary stored watchlist cache and recent search history on THIS browser only. Your cloud server account data will remain safe. Proceed?")) {
      return;
    }

    try {
      localStorage.removeItem("aniwavex_watchlist");
      localStorage.removeItem("aniwavex_search_history");
      setLocalDataCleared(true);
      setTimeout(() => setLocalDataCleared(false), 3000);
    } catch (err) {
      console.error("Failed to clear local data:", err);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Failed to generate export file.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aniwavex_account_data_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export account data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Data &amp; Storage Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Export your personal library and manage browser cache without affecting your cloud account.
        </p>
      </div>

      {/* ── Export Account Data Card ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Download Account Data</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Export your entire profile, watchlist, watch history, and bookmarks as a single JSON file.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export Data (JSON)</span>
          </button>
        </div>
      </div>

      {/* ── Local Browser Storage vs Cloud Server ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            Device Cache &amp; Storage
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Clear locally stored image assets or search query logs to free up space on this device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Clear Browser Image Cache */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Browser Image Cache</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Removes downloaded posters, banners, and temporary media stream chunks.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearImageCache}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all self-start flex items-center gap-1.5"
            >
              {cacheCleared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{cacheCleared ? "Cache Cleared!" : "Clear Image Cache"}</span>
            </button>
          </div>

          {/* Clear Local Storage Data */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Device Search History</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Removes recent anime queries and local search filter cookies.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearLocalData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all self-start flex items-center gap-1.5"
            >
              {localDataCleared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{localDataCleared ? "History Cleared!" : "Clear Local Cache"}</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Clearing local device cache does <strong>NOT</strong> delete any bookmarks, watch history, or account credentials from the AniWaveX cloud server.
          </span>
        </div>
      </div>
    </div>
  );
}
