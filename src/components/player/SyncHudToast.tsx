'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { LiveSyncResult } from '@/types/sync';

interface SyncHudToastProps {
  result: LiveSyncResult | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function SyncHudToast({
  result,
  onDismiss,
  onRetry,
}: SyncHudToastProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!result) return;
    // Auto-dismiss after 6 seconds if all successful
    const hasFailure =
      result.providers?.anilist?.status === 'FAILED' ||
      result.providers?.mal?.status === 'FAILED';

    const timer = setTimeout(() => {
      onDismiss();
    }, hasFailure ? 10000 : 5000);

    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result || !result.completed) return null;

  const anilistStatus = result.providers?.anilist;
  const malStatus = result.providers?.mal;

  const anyFailed =
    anilistStatus?.status === 'FAILED' ||
    anilistStatus?.status === 'REAUTH_REQUIRED' ||
    malStatus?.status === 'FAILED' ||
    malStatus?.status === 'REAUTH_REQUIRED';

  const anySuccess =
    anilistStatus?.status === 'SUCCESS' ||
    malStatus?.status === 'SUCCESS';

  const handleRetryClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-4 right-4 z-40 max-w-sm w-auto animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-left flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            anyFailed
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {anyFailed ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white tracking-tight">
              Episode {result.episodeNumber} Completed
            </p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              AniWaveX
            </span>
          </div>

          <div className="space-y-1 mt-1">
            {/* AniList Feedback */}
            {anilistStatus && anilistStatus.status !== 'NOT_CONNECTED' && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {anilistStatus.status === 'SUCCESS' && (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <span>✓</span> AniList updated (Ep {result.episodeNumber})
                  </span>
                )}
                {anilistStatus.status === 'FAILED' && (
                  <span className="text-amber-400 font-medium">
                    ⚠ AniList sync failed
                  </span>
                )}
                {anilistStatus.status === 'REAUTH_REQUIRED' && (
                  <span className="text-rose-400 font-medium">
                    ⚠ AniList reauth required
                  </span>
                )}
              </div>
            )}

            {/* MAL Feedback */}
            {malStatus && malStatus.status !== 'NOT_CONNECTED' && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {malStatus.status === 'SUCCESS' && (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <span>✓</span> MyAnimeList updated (Ep {result.episodeNumber})
                  </span>
                )}
                {malStatus.status === 'FAILED' && (
                  <span className="text-amber-400 font-medium">
                    ⚠ MyAnimeList sync failed
                  </span>
                )}
                {malStatus.status === 'REAUTH_REQUIRED' && (
                  <span className="text-rose-400 font-medium">
                    ⚠ MyAnimeList reauth required
                  </span>
                )}
              </div>
            )}

            {!anilistStatus && !malStatus && (
              <p className="text-[11px] text-slate-400">
                Progress saved to your AniWaveX history.
              </p>
            )}
          </div>

          {/* Inline Retry action if any failure */}
          {anyFailed && onRetry && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetryClick}
                disabled={isRetrying}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry Sync'}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
