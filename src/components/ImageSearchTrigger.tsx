"use client";

import React, { useState } from "react";
import { Camera } from "lucide-react";
import ImageSearchModal from "./ImageSearchModal";

interface ImageSearchTriggerProps {
  className?: string;
  variant?: "icon" | "button";
}

export default function ImageSearchTrigger({
  className = "",
  variant = "icon",
}: ImageSearchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white text-xs font-medium transition-all ${className}`}
          title="Search anime by screenshot"
          aria-label="Search anime by screenshot"
        >
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>Screenshot Search</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`p-2 text-slate-300 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-colors relative flex items-center justify-center ${className}`}
          title="Search anime by screenshot"
          aria-label="Search anime by screenshot"
        >
          <Camera className="w-5 h-5" />
        </button>
      )}

      <ImageSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
