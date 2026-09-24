"use client";

import React from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { Palette, Zap, Wind, Check, Cpu } from "lucide-react";

export default function AppearanceSettings() {
  const {
    activeTheme,
    themeId,
    setTheme,
    isUltraLite,
    setUltraLite,
    isReduceMotion,
    setReduceMotion,
    isLowSpec,
    themes,
  } = useTheme();

  const darkThemes = themes.filter((t) => t.category === "dark");
  const lightThemes = themes.filter((t) => t.category === "light");
  const specialThemes = themes.filter((t) => t.category === "special");

  return (
    <div className="space-y-6">
      {/* Ultra Lite & Performance Toggle */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Ultra Lite Mode</h3>
                {isLowSpec && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Recommended for your device
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Disables backdrop blur, shadows, glows, and heavy gradients for maximum speed on mobile &amp; low-end Android devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUltraLite(!isUltraLite)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isUltraLite ? "bg-amber-500" : "bg-slate-700"
            }`}
            aria-label="Toggle Ultra Lite Mode"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isUltraLite ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Reduce Motion Toggle */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Reduce Motion</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Replaces animations and page transitions with instant snappy rendering.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReduceMotion(!isReduceMotion)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isReduceMotion ? "bg-blue-600" : "bg-slate-700"
            }`}
            aria-label="Toggle Reduce Motion"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isReduceMotion ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 25 Themes Selector Grid */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-white">Color Themes ({themes.length})</h3>
        </div>

        {/* Dark Themes */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dark Themes ({darkThemes.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {darkThemes.map((t) => (
              <ThemeButton key={t.id} theme={t} isSelected={themeId === t.id} onSelect={() => setTheme(t.id)} />
            ))}
          </div>
        </div>

        {/* Light Themes */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Light Themes ({lightThemes.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {lightThemes.map((t) => (
              <ThemeButton key={t.id} theme={t} isSelected={themeId === t.id} onSelect={() => setTheme(t.id)} />
            ))}
          </div>
        </div>

        {/* Special & Battery Saver Themes */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Special &amp; OLED Saver ({specialThemes.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {specialThemes.map((t) => (
              <ThemeButton key={t.id} theme={t} isSelected={themeId === t.id} onSelect={() => setTheme(t.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeButton({
  theme,
  isSelected,
  onSelect,
}: {
  theme: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`theme-card-btn relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-500/15 shadow-md ring-1 ring-blue-500"
          : "border-white/10 hover:border-white/20 bg-slate-950/60 hover:bg-slate-950/90"
      }`}
    >
      <div
        className="w-7 h-7 rounded-lg shrink-0 border border-white/20 flex items-center justify-center text-xs shadow-sm"
        style={{ backgroundColor: theme.colors.background }}
      >
        <span>{theme.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{theme.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: theme.colors.primary }} />
          <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: theme.colors.card }} />
        </div>
      </div>

      {isSelected && (
        <div className="shrink-0 p-1 rounded-full bg-blue-600 text-white shadow-sm">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      )}
    </button>
  );
}
