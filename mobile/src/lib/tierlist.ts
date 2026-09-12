export interface TierItem {
  id: string | number;
  slug: string;
  title: string;
  posterImage: string;
  rating?: string;
  year?: string;
}

export interface TierRow {
  id: string;
  label: string;
  color: string; // Tailwind color class or hex
  bgGradient: string;
  items: TierItem[];
}

export interface AnimeTierList {
  id: string;
  title: string;
  description?: string;
  username?: string;
  userId?: string;
  rows: TierRow[];
  unrankedPool: TierItem[];
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_TIER_ROWS: TierRow[] = [
  {
    id: "tier-s",
    label: "S",
    color: "#ef4444",
    bgGradient: "from-red-600 to-rose-700",
    items: [],
  },
  {
    id: "tier-a",
    label: "A",
    color: "#f97316",
    bgGradient: "from-orange-500 to-amber-600",
    items: [],
  },
  {
    id: "tier-b",
    label: "B",
    color: "#eab308",
    bgGradient: "from-yellow-500 to-amber-500",
    items: [],
  },
  {
    id: "tier-c",
    label: "C",
    color: "#22c55e",
    bgGradient: "from-green-500 to-emerald-600",
    items: [],
  },
  {
    id: "tier-d",
    label: "D",
    color: "#3b82f6",
    bgGradient: "from-blue-500 to-indigo-600",
    items: [],
  },
  {
    id: "tier-f",
    label: "F",
    color: "#64748b",
    bgGradient: "from-slate-600 to-slate-800",
    items: [],
  },
];

export const PROFILE_BANNER_PRESETS = [
  {
    id: "cyberpunk",
    label: "Neon Cyberpunk",
    gradient: "from-purple-900 via-indigo-900 to-blue-900",
    border: "border-purple-500/30",
  },
  {
    id: "galaxy",
    label: "Midnight Galaxy",
    gradient: "from-blue-950 via-slate-900 to-indigo-950",
    border: "border-blue-500/30",
  },
  {
    id: "sunset",
    label: "Crimson Sunset",
    gradient: "from-rose-950 via-red-900 to-amber-950",
    border: "border-red-500/30",
  },
  {
    id: "emerald",
    label: "Emerald Mystic",
    gradient: "from-emerald-950 via-teal-900 to-slate-950",
    border: "border-emerald-500/30",
  },
  {
    id: "dark-matter",
    label: "Dark Matter",
    gradient: "from-slate-900 via-slate-950 to-black",
    border: "border-white/10",
  },
];
