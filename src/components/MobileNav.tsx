"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Handle Escape key to close drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AniWaveX
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="flex flex-col py-4">
              <Link 
                href="/" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/catalog" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Catalog
              </Link>
              <Link 
                href="/catalog?format=movie" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Movies
              </Link>
              <Link 
                href="/catalog?sort=newest" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                New Releases
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
