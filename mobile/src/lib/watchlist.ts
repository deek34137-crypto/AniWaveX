export type WatchlistStatus = 'watching' | 'plan_to_watch' | 'completed' | 'on_hold' | 'dropped';

export interface WatchlistCategory {
  id: WatchlistStatus | 'all';
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const WATCHLIST_STATUSES: Record<WatchlistStatus, WatchlistCategory> = {
  watching: {
    id: 'watching',
    label: 'Watching',
    color: 'blue',
    badgeBg: 'bg-blue-600/20',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/30'
  },
  plan_to_watch: {
    id: 'plan_to_watch',
    label: 'Plan to Watch',
    color: 'amber',
    badgeBg: 'bg-amber-600/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30'
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    color: 'emerald',
    badgeBg: 'bg-emerald-600/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30'
  },
  on_hold: {
    id: 'on_hold',
    label: 'On Hold',
    color: 'purple',
    badgeBg: 'bg-purple-600/20',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/30'
  },
  dropped: {
    id: 'dropped',
    label: 'Dropped',
    color: 'rose',
    badgeBg: 'bg-rose-600/20',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30'
  }
};
