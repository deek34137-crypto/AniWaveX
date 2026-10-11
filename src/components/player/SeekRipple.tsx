'use client';

import React from 'react';
import { FastForward, Rewind } from 'lucide-react';

interface SeekRippleProps {
  type: 'forward' | 'backward' | null;
  seekAmount?: number;
}

export default function SeekRipple({ type, seekAmount = 10 }: SeekRippleProps) {
  if (!type) return null;

  const isForward = type === 'forward';

  return (
    <div
      className={`absolute inset-y-0 ${
        isForward ? 'right-0 rounded-r-2xl pr-8 md:pr-14 justify-end' : 'left-0 rounded-l-2xl pl-8 md:pl-14 justify-start'
      } w-1/3 z-30 pointer-events-none flex items-center bg-white/10 backdrop-blur-[2px] transition-all animate-in fade-in zoom-in-95 duration-200`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-1.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-pulse">
        <div className="p-3 sm:p-4 rounded-full bg-black/60 border border-white/20 shadow-xl flex items-center justify-center">
          {isForward ? (
            <FastForward className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white" />
          ) : (
            <Rewind className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white" />
          )}
        </div>
        <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase font-mono">
          {isForward ? `+${seekAmount}s` : `-${seekAmount}s`}
        </span>
      </div>
    </div>
  );
}
