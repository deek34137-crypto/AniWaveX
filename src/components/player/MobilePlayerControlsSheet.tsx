'use client';

import React from 'react';
import { 
  X, 
  Server, 
  Sliders, 
  Sparkles, 
  Languages, 
  Gauge, 
  RectangleHorizontal, 
  Maximize2,
  ChevronRight,
  Activity
} from 'lucide-react';
import { cleanServerLabel } from '@/components/InPageVideoPlayer';
import { formatLatencyBadge } from '@/lib/latency-benchmarker';

interface MobilePlayerControlsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Audio Track Tab
  activeTab: 'sub' | 'dub' | 'hindi';
  onTabChange: (tab: 'sub' | 'dub' | 'hindi') => void;
  // Servers
  activeSources: any[];
  validServerIndex: number;
  onSelectServer: (index: number) => void;
  serverLatencies: Record<string, number>;
  // Playback Features
  ambientMode: boolean;
  onToggleAmbient: () => void;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  // Auto-skip
  autoSkip: boolean;
  onToggleAutoSkip: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

export default function MobilePlayerControlsSheet({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  activeSources,
  validServerIndex,
  onSelectServer,
  serverLatencies,
  ambientMode,
  onToggleAmbient,
  isTheaterMode,
  onToggleTheater,
  playbackRate,
  onPlaybackRateChange,
  autoSkip,
  onToggleAutoSkip,
}: MobilePlayerControlsSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div 
        role="dialog"
        aria-label="Player Settings & Server Controls"
        className="relative w-full max-w-lg bg-slate-950 border-t border-white/15 rounded-t-3xl shadow-2xl p-5 pb-8 space-y-5 z-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        {/* Header Handle */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Player Controls & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Audio Track & Language */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-blue-400" />
            <span>Audio & Dubbing Track</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onTabChange('sub')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'sub'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              SUB (JP)
            </button>
            <button
              onClick={() => onTabChange('dub')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'dub'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ENG DUB
            </button>
            <button
              onClick={() => onTabChange('hindi')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                activeTab === 'hindi'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'hindi' ? 'bg-white' : 'bg-amber-400 animate-pulse'}`} />
              HINDI DUB
            </button>
          </div>
        </div>

        {/* 2. Streaming Servers */}
        {activeSources && activeSources.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Stream Servers</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {validServerIndex + 1} of {activeSources.length}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activeSources.map((source, idx) => {
                const latency = serverLatencies[source.url];
                const latBadge = formatLatencyBadge(latency);
                const isSelected = validServerIndex === idx;

                return (
                  <button
                    key={`${source.url}-${idx}`}
                    onClick={() => {
                      onSelectServer(idx);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-400/50'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="truncate">{cleanServerLabel(source.quality)}</span>
                    </div>
                    {latency && (
                      <span className="text-[10px] font-mono opacity-60 ml-1 shrink-0">
                        {latency}ms
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Playback Speed */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>Playback Speed</span>
          </label>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  playbackRate === rate
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* 4. Display & Experience Preferences */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Viewing Modes & Shortcuts</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleAmbient}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                ambientMode
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Ambient Glow</span>
            </button>
            <button
              onClick={onToggleTheater}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                isTheaterMode
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}
            >
              <RectangleHorizontal className="w-4 h-4 shrink-0" />
              <span>Theater Mode</span>
            </button>
          </div>

          <button
            onClick={onToggleAutoSkip}
            className={`w-full p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all ${
              autoSkip
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            <span>Auto-Skip Intros & Outros (AniSkip)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${autoSkip ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/10 text-slate-500'}`}>
              {autoSkip ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
