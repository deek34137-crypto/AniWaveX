"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, Download, ArrowRight, X } from "lucide-react";
import { getAllOfflineChapters } from "@/lib/manga/offline-storage";

export default function OfflineIndicatorBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [hasDownloads, setHasDownloads] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);

      // Register service worker if supported
      if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      // Check if user has offline chapters saved
      getAllOfflineChapters()
        .then((chapters) => {
          setHasDownloads(chapters.length > 0);
        })
        .catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Also check downloads immediately in case page loads offline
    if (!navigator.onLine) {
      getAllOfflineChapters()
        .then((chapters) => {
          setHasDownloads(chapters.length > 0);
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline || isDismissed) return null;

  return (
    <aside
      aria-label="Offline Mode Notice"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9999] p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 border border-cyan-500/20">
          <WifiOff className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>You're Offline</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </h4>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss offline banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            {hasDownloads
              ? "You can still read your downloaded manga chapters without an internet connection."
              : "No connection detected. Connect to the internet or open your saved downloads."}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <Link
              href="/downloads"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Go to Offline Downloads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
