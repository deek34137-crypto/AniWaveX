"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from "lucide-react";

export default function MangaReaderRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const mangaId = typeof params?.id === "string" ? params.id : undefined;

  useEffect(() => {
    console.error("[MangaReaderRoute] Uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Failed to Load Manga Chapter</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            We couldn&apos;t load this chapter or its CDN image sources. You can retry loading or return to the manga page.
          </p>
        </div>

        {error.message && process.env.NODE_ENV !== "production" && (
          <div className="w-full text-left bg-black/50 border border-white/10 rounded-lg p-2.5 text-[11px] font-mono text-rose-300 max-h-24 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
          {mangaId && (
            <Link
              href={`/manga/${mangaId}`}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Manga Info
            </Link>
          )}
        </div>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors mt-1"
        >
          <Home className="w-3.5 h-3.5" /> Return to AniWaveX Home
        </Link>
      </div>
    </div>
  );
}
