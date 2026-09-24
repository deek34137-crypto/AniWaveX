"use client";

import AppearanceSettings from "@/components/profile/AppearanceSettings";
import { Palette } from "lucide-react";

export default function AppearanceSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-400" />
          Appearance &amp; Themes
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Customize colors, high-performance battery saver mode, and animation settings.
        </p>
      </div>

      <AppearanceSettings />
    </div>
  );
}
