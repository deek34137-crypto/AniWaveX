/**
 * Theme & Performance Configuration for AniWaveX
 * Features:
 * - 25 curated themes (18 Dark, 4 Light, 3 Special)
 * - Ultra Lite Mode (disables animations, blurs, shadows, heavy gradients for low-end hardware)
 * - Hardware performance detection (cpuCores <= 4 || deviceMemory <= 4)
 * - LocalStorage persistence and instantaneous HTML attribute bootstrapping
 */

export type ThemeCategory = 'dark' | 'light' | 'special';

export interface ThemeDefinition {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  icon: string;
  colors: {
    background: string;
    card: string;
    cardBorder: string;
    primary: string;
    primaryHover: string;
    muted: string;
    foreground: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  // ── Dark Themes ──────────────────────────────────────────────────────────
  {
    id: 'default',
    name: 'Midnight Slate (Default)',
    category: 'dark',
    description: 'Deep navy background with cyan & royal blue highlights',
    icon: '🌙',
    colors: {
      background: '#0b0f19',
      card: 'rgba(30, 41, 59, 0.7)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      muted: '#94a3b8',
      foreground: '#f1f5f9',
    },
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    category: 'dark',
    description: 'Soft sakura rose and fuchsia glow on midnight cherry',
    icon: '🌸',
    colors: {
      background: '#140c12',
      card: 'rgba(40, 20, 35, 0.7)',
      cardBorder: 'rgba(244, 114, 182, 0.2)',
      primary: '#ec4899',
      primaryHover: '#db2777',
      muted: '#a8929e',
      foreground: '#fdf2f8',
    },
  },
  {
    id: 'neon-tokyo',
    name: 'Neon Tokyo',
    category: 'dark',
    description: 'Cyberpunk electric violet & neon magenta accents',
    icon: '🗼',
    colors: {
      background: '#0e0917',
      card: 'rgba(32, 17, 54, 0.7)',
      cardBorder: 'rgba(168, 85, 247, 0.25)',
      primary: '#a855f7',
      primaryHover: '#9333ea',
      muted: '#9f94b3',
      foreground: '#faf5ff',
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    category: 'dark',
    description: 'Emerald and teal northern lights shimmer',
    icon: '✨',
    colors: {
      background: '#081316',
      card: 'rgba(15, 38, 43, 0.7)',
      cardBorder: 'rgba(20, 184, 166, 0.2)',
      primary: '#14b8a6',
      primaryHover: '#0d9488',
      muted: '#8aa3a7',
      foreground: '#f0fdfa',
    },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    category: 'dark',
    description: 'Abyssal ocean blue with luminous cyan glow',
    icon: '🌊',
    colors: {
      background: '#06101e',
      card: 'rgba(12, 28, 51, 0.7)',
      cardBorder: 'rgba(56, 189, 248, 0.2)',
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      muted: '#7f99b2',
      foreground: '#f0f9ff',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    category: 'dark',
    description: 'High-voltage electric amber & cyan contrasts',
    icon: '🤖',
    colors: {
      background: '#12120b',
      card: 'rgba(38, 38, 18, 0.7)',
      cardBorder: 'rgba(234, 179, 8, 0.25)',
      primary: '#eab308',
      primaryHover: '#ca8a04',
      muted: '#a8a58f',
      foreground: '#fefce8',
    },
  },
  {
    id: 'zen-garden',
    name: 'Zen Garden',
    category: 'dark',
    description: 'Peaceful bamboo moss and forest greenery',
    icon: '🌿',
    colors: {
      background: '#0b140e',
      card: 'rgba(21, 41, 28, 0.7)',
      cardBorder: 'rgba(34, 197, 94, 0.2)',
      primary: '#22c55e',
      primaryHover: '#16a34a',
      muted: '#8aa392',
      foreground: '#f0fdf4',
    },
  },
  {
    id: 'brutalism-dark',
    name: 'Brutalist Dark',
    category: 'dark',
    description: 'Heavy contrast stark slate with safety orange edges',
    icon: '⬛',
    colors: {
      background: '#09090b',
      card: 'rgba(24, 24, 27, 0.95)',
      cardBorder: 'rgba(255, 255, 255, 0.25)',
      primary: '#f97316',
      primaryHover: '#ea580c',
      muted: '#a1a1aa',
      foreground: '#fafafa',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'dark',
    description: 'Pure stealth monochrome slate and silver',
    icon: '🖤',
    colors: {
      background: '#0f0f11',
      card: 'rgba(28, 28, 31, 0.7)',
      cardBorder: 'rgba(255, 255, 255, 0.12)',
      primary: '#94a3b8',
      primaryHover: '#cbd5e1',
      muted: '#71717a',
      foreground: '#f4f4f5',
    },
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    category: 'dark',
    description: 'Radiant ember tones and warm golden orange',
    icon: '☀️',
    colors: {
      background: '#160d06',
      card: 'rgba(46, 26, 12, 0.7)',
      cardBorder: 'rgba(249, 115, 22, 0.2)',
      primary: '#f97316',
      primaryHover: '#ea580c',
      muted: '#a89487',
      foreground: '#fff7ed',
    },
  },
  {
    id: 'caffeine',
    name: 'Caffeine Roast',
    category: 'dark',
    description: 'Rich espresso brown with warm caramel tones',
    icon: '☕',
    colors: {
      background: '#140f0c',
      card: 'rgba(38, 28, 22, 0.7)',
      cardBorder: 'rgba(217, 119, 6, 0.2)',
      primary: '#d97706',
      primaryHover: '#b45309',
      muted: '#a3978f',
      foreground: '#fffbeb',
    },
  },
  {
    id: 'brutalism-plus',
    name: 'Brutalist Plus',
    category: 'dark',
    description: 'Stark geometric borders with vivid cyan-teal accents',
    icon: '⬜',
    colors: {
      background: '#0d1117',
      card: 'rgba(22, 27, 34, 0.9)',
      cardBorder: 'rgba(45, 212, 191, 0.3)',
      primary: '#2dd4bf',
      primaryHover: '#14b8a6',
      muted: '#8b949e',
      foreground: '#f0f6fc',
    },
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    category: 'dark',
    description: 'Deep cosmic void with interstellar purple glow',
    icon: '🌌',
    colors: {
      background: '#07060e',
      card: 'rgba(22, 18, 38, 0.7)',
      cardBorder: 'rgba(139, 92, 246, 0.25)',
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      muted: '#968fa3',
      foreground: '#f5f3ff',
    },
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    category: 'dark',
    description: 'Imperial charcoal black with burnished luxury gold',
    icon: '👑',
    colors: {
      background: '#100e08',
      card: 'rgba(36, 31, 18, 0.7)',
      cardBorder: 'rgba(234, 179, 8, 0.25)',
      primary: '#eab308',
      primaryHover: '#ca8a04',
      muted: '#9e9680',
      foreground: '#fefce8',
    },
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    category: 'dark',
    description: 'Lush dark rainforest with luminous jade highlights',
    icon: '🌲',
    colors: {
      background: '#06130d',
      card: 'rgba(16, 41, 28, 0.7)',
      cardBorder: 'rgba(16, 185, 129, 0.2)',
      primary: '#10b981',
      primaryHover: '#059669',
      muted: '#7fa391',
      foreground: '#ecfdf5',
    },
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    category: 'dark',
    description: 'Crimson gothic night with deep ruby red buttons',
    icon: '🩸',
    colors: {
      background: '#160709',
      card: 'rgba(46, 16, 21, 0.7)',
      cardBorder: 'rgba(239, 68, 68, 0.25)',
      primary: '#ef4444',
      primaryHover: '#dc2626',
      muted: '#aa8c90',
      foreground: '#fef2f2',
    },
  },
  {
    id: 'frostbite',
    name: 'Frostbite',
    category: 'dark',
    description: 'Glacial ice cave with frozen cerulean light',
    icon: '❄️',
    colors: {
      background: '#081119',
      card: 'rgba(18, 36, 51, 0.7)',
      cardBorder: 'rgba(56, 189, 248, 0.2)',
      primary: '#38bdf8',
      primaryHover: '#0284c7',
      muted: '#829bb0',
      foreground: '#f0f9ff',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s',
    category: 'dark',
    description: 'Outrun retro neon with hot pink and violet vibes',
    icon: '📼',
    colors: {
      background: '#13081a',
      card: 'rgba(41, 16, 56, 0.7)',
      cardBorder: 'rgba(236, 72, 153, 0.3)',
      primary: '#ec4899',
      primaryHover: '#db2777',
      muted: '#a88ca7',
      foreground: '#fdf2f8',
    },
  },
  {
    id: 'vampire',
    name: 'Vampire Lord',
    category: 'dark',
    description: 'Burgundy velvet shadows and midnight rose accents',
    icon: '🧛',
    colors: {
      background: '#120508',
      card: 'rgba(38, 12, 18, 0.7)',
      cardBorder: 'rgba(225, 29, 72, 0.25)',
      primary: '#e11d48',
      primaryHover: '#be123c',
      muted: '#a3848b',
      foreground: '#fff1f2',
    },
  },

  // ── Light Themes ─────────────────────────────────────────────────────────
  {
    id: 'light-minimal',
    name: 'Light Minimal',
    category: 'light',
    description: 'Crisp snow white with modern sapphire accents',
    icon: '☀️',
    colors: {
      background: '#f1f5f9',
      card: '#ffffff',
      cardBorder: 'rgba(15, 23, 42, 0.12)',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      muted: '#64748b',
      foreground: '#0f172a',
    },
  },
  {
    id: 'light-sakura',
    name: 'Light Sakura',
    category: 'light',
    description: 'Gentle pastel blush and soft cherry floral tints',
    icon: '🌷',
    colors: {
      background: '#fdf2f8',
      card: '#ffffff',
      cardBorder: 'rgba(219, 39, 119, 0.25)',
      primary: '#db2777',
      primaryHover: '#be185d',
      muted: '#9d7b88',
      foreground: '#831843',
    },
  },
  {
    id: 'matcha-light',
    name: 'Matcha Tea',
    category: 'light',
    description: 'Creamy green tea garden with calming sage tones',
    icon: '🍵',
    colors: {
      background: '#f0fdf4',
      card: '#ffffff',
      cardBorder: 'rgba(22, 163, 74, 0.22)',
      primary: '#16a34a',
      primaryHover: '#15803d',
      muted: '#5e7164',
      foreground: '#14532d',
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    category: 'light',
    description: 'Fresh seaside sky with breezy cerulean waves',
    icon: '🌬️',
    colors: {
      background: '#f0f9ff',
      card: '#ffffff',
      cardBorder: 'rgba(2, 132, 199, 0.22)',
      primary: '#0284c7',
      primaryHover: '#0369a1',
      muted: '#5f7b8c',
      foreground: '#0c4a6e',
    },
  },

  // ── Special & High Performance Themes ─────────────────────────────────────
  {
    id: 'brutalist-concrete',
    name: 'Brutalist Concrete',
    category: 'special',
    description: 'Raw architectural cement with industrial black & red borders',
    icon: '🧱',
    colors: {
      background: '#e4e4e7',
      card: '#ffffff',
      cardBorder: '#27272a',
      primary: '#dc2626',
      primaryHover: '#b91c1c',
      muted: '#52525b',
      foreground: '#09090b',
    },
  },
  {
    id: 'amoled',
    name: 'AMOLED Pure Black',
    category: 'special',
    description: '100% true pitch black (#000000) for maximal OLED battery saving',
    icon: '🔋',
    colors: {
      background: '#000000',
      card: '#0a0a0a',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      muted: '#737373',
      foreground: '#ffffff',
    },
  },
  {
    id: 'ultra-lite',
    name: 'Ultra Lite (Performance)',
    category: 'special',
    description: 'Optimized solid matte mode designed to maximize Android FPS and battery',
    icon: '⚡',
    colors: {
      background: '#0b0f19',
      card: '#131b2e',
      cardBorder: 'rgba(255, 255, 255, 0.06)',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      muted: '#94a3b8',
      foreground: '#f1f5f9',
    },
  },
];

export const THEME_STORAGE_KEY = 'aniwavex_active_theme';
export const ULTRA_LITE_STORAGE_KEY = 'aniwavex_ultra_lite_mode';
export const REDUCE_MOTION_STORAGE_KEY = 'aniwavex_reduce_motion';

/**
 * Detects whether the current device is low-performance:
 * - Hardware concurrency <= 4 cores
 * - Device memory <= 4 GB
 */
export function isLowEndHardware(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as any;
  const cores = nav.hardwareConcurrency || 8;
  const memory = nav.deviceMemory || 8;
  return cores <= 4 || memory <= 4;
}

/**
 * Apply theme CSS variables and data attributes to <html>
 */
export function applyThemeToDOM(themeId: string, isUltraLite = false, isReduceMotion = false): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const isLight = theme.category === 'light' || theme.id === 'brutalist-concrete';

  // Set data-theme and data-theme-mode attributes
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-mode', isLight ? 'light' : 'dark');
  root.style.colorScheme = isLight ? 'light' : 'dark';

  // Set CSS custom properties
  root.style.setProperty('--theme-background', theme.colors.background);
  root.style.setProperty('--theme-card', theme.colors.card);
  root.style.setProperty('--theme-card-border', theme.colors.cardBorder);
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-muted', theme.colors.muted);
  root.style.setProperty('--theme-foreground', theme.colors.foreground);

  // Toggle Ultra Lite and Reduce Motion classes
  root.classList.toggle('ultra-lite', isUltraLite || themeId === 'ultra-lite');
  root.classList.toggle('reduce-motion', isReduceMotion);
}
