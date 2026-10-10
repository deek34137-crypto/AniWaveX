/**
 * Theme & Performance Configuration for AniWaveX
 * Features:
 * - 6 Core High-Quality Themes (4 Dark, 1 Light, 1 Special OLED)
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
  // ── Core Dark Themes ───────────────────────────────────────────────────────
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
    id: 'neon-tokyo',
    name: 'Cyberpunk Neon',
    category: 'dark',
    description: 'Electric violet & neon magenta cyberpunk accents',
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

  // ── Light Theme ───────────────────────────────────────────────────────────
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

  // ── OLED Battery Saver ────────────────────────────────────────────────────
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
  const isLight = theme.category === 'light';

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
  root.classList.toggle('ultra-lite', isUltraLite);
  root.classList.toggle('reduce-motion', isReduceMotion);
}
