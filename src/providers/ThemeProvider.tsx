"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import {
  THEMES,
  ThemeDefinition,
  THEME_STORAGE_KEY,
  ULTRA_LITE_STORAGE_KEY,
  REDUCE_MOTION_STORAGE_KEY,
  isLowEndHardware,
  applyThemeToDOM,
} from '@/lib/theme-config';

interface ThemeContextType {
  activeTheme: ThemeDefinition;
  themeId: string;
  setTheme: (id: string) => void;
  isUltraLite: boolean;
  setUltraLite: (enabled: boolean) => void;
  isReduceMotion: boolean;
  setReduceMotion: (enabled: boolean) => void;
  isLowSpec: boolean;
  themes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const emptySubscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>('default');
  const [isUltraLite, setIsUltraLiteState] = useState<boolean>(false);
  const [isReduceMotion, setIsReduceMotionState] = useState<boolean>(false);
  const [isLowSpec, setIsLowSpec] = useState<boolean>(false);
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Initialize from LocalStorage or hardware detection
  useEffect(() => {
    const lowEnd = isLowEndHardware();
    setIsLowSpec(lowEnd);

    // Stored theme
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialThemeId = storedTheme && THEMES.some((t) => t.id === storedTheme) ? storedTheme : 'default';
    setThemeId(initialThemeId);

    // Stored Ultra Lite
    const storedUltraLite = localStorage.getItem(ULTRA_LITE_STORAGE_KEY);
    const initialUltraLite = storedUltraLite !== null ? storedUltraLite === 'true' : lowEnd;
    setIsUltraLiteState(initialUltraLite);

    // Stored Reduce Motion
    const storedMotion = localStorage.getItem(REDUCE_MOTION_STORAGE_KEY);
    const initialMotion = storedMotion !== null ? storedMotion === 'true' : lowEnd;
    setIsReduceMotionState(initialMotion);

    // Apply to DOM
    applyThemeToDOM(initialThemeId, initialUltraLite, initialMotion);
  }, []);

  const setTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    applyThemeToDOM(id, isUltraLite, isReduceMotion);
  };

  const setUltraLite = (enabled: boolean) => {
    setIsUltraLiteState(enabled);
    localStorage.setItem(ULTRA_LITE_STORAGE_KEY, String(enabled));
    applyThemeToDOM(themeId, enabled, isReduceMotion);
  };

  const setReduceMotion = (enabled: boolean) => {
    setIsReduceMotionState(enabled);
    localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, String(enabled));
    applyThemeToDOM(themeId, isUltraLite, enabled);
  };

  const activeTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        themeId,
        setTheme,
        isUltraLite,
        setUltraLite,
        isReduceMotion,
        setReduceMotion,
        isLowSpec,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
