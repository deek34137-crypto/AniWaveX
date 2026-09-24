export interface PlaybackSession {
  animeSlug: string;
  animeTitle: string;
  animePosterImage?: string;
  kitsuId?: string | number;
  anilistId?: number | null;
  malId?: number | null;
  episodeNumber: number;
  episodeId: string | number;
  lastPosition: number;
  duration: number;
  completed: boolean;
  completedAt?: string;
}

export interface AnimeMapping {
  id?: string;
  anime_slug: string;
  kitsu_id?: string | null;
  anilist_id?: number | null;
  mal_id?: number | null;
  title?: string | null;
  total_episodes?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type SyncJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'REAUTH_REQUIRED';

export interface SyncJob {
  id: string;
  user_id: string;
  anime_slug: string;
  anime_title?: string;
  episode_number: number;
  total_episodes?: number;
  provider: 'ANILIST' | 'MYANIMELIST';
  operation: string;
  status: SyncJobStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  error?: string;
  source: string;
  created_at: string;
  completed_at?: string;
}

export interface SyncConflict {
  id: string;
  user_id: string;
  anime_slug: string;
  anime_title?: string;
  local_progress: number;
  anilist_progress?: number;
  mal_progress?: number;
  status: 'UNRESOLVED' | 'RESOLVED';
  resolution_policy?: string;
  created_at: string;
  resolved_at?: string;
}

export interface ProviderSyncStatus {
  status: 'SUCCESS' | 'FAILED' | 'REAUTH_REQUIRED' | 'SKIPPED' | 'NOT_CONNECTED';
  message?: string;
  progress?: number;
}

export interface LiveSyncResult {
  success: boolean;
  localSaved: boolean;
  completed: boolean;
  episodeNumber: number;
  providers: {
    anilist?: ProviderSyncStatus;
    mal?: ProviderSyncStatus;
  };
  source: 'ANIWAVEX';
  timestamp: string;
  error?: string;
}
