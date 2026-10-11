"use client";

import React, { memo } from "react";
import type { SkipInterval } from "@/lib/aniskip";

interface SkipIntervalButtonProps {
  activeSkip: SkipInterval | null;
  mediaDuration: number;
  hasNext: boolean;
  onExecuteSkip: () => void;
  disabled?: boolean;
}

export const SkipIntervalButton = memo(function SkipIntervalButton({
  activeSkip,
  mediaDuration,
  hasNext,
  onExecuteSkip,
  disabled = false,
}: SkipIntervalButtonProps) {
  if (!activeSkip || disabled) return null;

  const dur = mediaDuration || 1440;
  const isPostCredits = activeSkip.type === "ed" && (dur - activeSkip.endTime > 90);
  const buttonLabel =
    activeSkip.type === "op"
      ? "Skip Intro"
      : activeSkip.type === "ed"
      ? (hasNext && !isPostCredits ? "Watch Next" : "Skip Outro")
      : "Skip Recap";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onExecuteSkip();
      }}
      className="absolute bottom-16 sm:bottom-[4.5rem] right-4 sm:right-6 z-40 overflow-hidden min-w-[128px] sm:min-w-[144px] h-9 sm:h-10 px-6 sm:px-7 rounded-md bg-black/70 hover:bg-black/90 border border-white/80 text-white font-semibold text-xs sm:text-sm backdrop-blur-sm shadow-2xl opacity-70 hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto active:scale-95 animate-in fade-in whitespace-nowrap"
      title={`${buttonLabel} (${Math.round(activeSkip.endTime - activeSkip.startTime)}s)`}
    >
      {/* Left-to-Right Fill Progress Effect (Hardware-accelerated CSS animation) */}
      <div
        className="absolute inset-y-0 left-0 bg-white/20 border-r border-white/40 pointer-events-none"
        style={{ animation: "skipProgressFill 10s linear forwards" }}
      />

      <span className="relative z-10 select-none tracking-wide text-white whitespace-nowrap">
        {buttonLabel}
      </span>
    </button>
  );
});
