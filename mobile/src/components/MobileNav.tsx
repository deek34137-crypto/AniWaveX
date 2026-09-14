"use client";

import { useState, useEffect } from "react";
import { Menu, X, Home, Compass, Calendar, Layers, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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

  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Catalog", href: "/catalog", icon: Compass },
    { label: "Schedule", href: "/airing", icon: Calendar },
    { label: "Tier List", href: "/tier-list", icon: Layers },
    { label: "Movies", href: "/catalog?format=movie", icon: Film },
    { label: "New Releases", href: "/catalog?sort=newest", icon: Sparkles },
  ];

  return (
    <>
      <button 
        type="button"
        aria-label="Open mobile navigation menu"
        onClick={() => setIsOpen(true)}
        className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          {/* Solid Opaque Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer with 100% Opaque Solid Background */}
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] border-r border-white/10 shadow-2xl flex flex-col z-10 transition-transform"
            style={{ backgroundColor: "#0b0f19" }}
          >
            {/* Safe area top padded header */}
            <div 
              className="px-5 py-4 border-b border-white/10 flex items-center justify-between"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  AniWaveX
                </span>
              </div>
              <button 
                type="button"
                aria-label="Close mobile navigation menu"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex flex-col py-3 px-3 gap-1 overflow-y-auto">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.label}
                    href={item.href} 
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      isActive 
                        ? "text-blue-400 bg-blue-600/15 border border-blue-500/20 shadow-sm" 
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto p-4 border-t border-white/10 text-xs text-slate-500">
              AniWaveX &bull; Stream Anywhere
            </div>
          </div>
        </div>
      )}
    </>
  );
}
