"use client";

import React, { useState } from "react";
import { Camera } from "lucide-react";
import ImageSearchModal from "./ImageSearchModal";

export default function ImageSearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-colors relative flex items-center justify-center"
        title="Search by Screenshot (Trace.moe)"
        aria-label="Search anime by screenshot"
      >
        <Camera className="w-5 h-5" />
      </button>

      <ImageSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
