export type AccountTab =
  | "overview"
  | "edit"
  | "history"
  | "connected"
  | "sync"
  | "security"
  | "appearance"
  | "notifications"
  | "privacy"
  | "data"
  | "danger";

export interface UserPrivacySettings {
  profile: "public" | "private";
  watchlist: "public" | "private";
  activity: "public" | "private";
}

export interface UserNotificationSettings {
  anime: boolean;
  episodes: boolean;
  sync: boolean;
  security: boolean;
}

export interface UserStats {
  anime_watched: number;
  episodes_watched: number;
  completed: number;
  currently_watching: number;
  plan_to_watch: number;
  watch_time_seconds: number;
  favorites_count: number;
}

export interface ExternalAccountSyncSettings {
  sync_status: boolean;
  sync_progress: boolean;
  sync_scores: boolean;
  direction: "two_way" | "export_only" | "import_only";
}

export interface ExternalAccountInfo {
  id: string;
  provider: "ANILIST" | "MYANIMELIST";
  provider_user_id: string;
  username: string;
  avatar_url?: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "SYNCING" | "ERROR";
  last_synced_at?: string | null;
  sync_settings: ExternalAccountSyncSettings;
  created_at?: string;
  updated_at?: string;
}

export interface SyncHistoryEvent {
  id: string;
  provider: string;
  status: "SUCCESS" | "ERROR" | "CONFLICT";
  items_synced: number;
  progress_updates: number;
  summary: string;
  details?: any;
  created_at: string;
}

export interface SyncConflictItem {
  id: string; // anime slug or remote id
  title: string;
  poster_image: string;
  local_episode: number;
  local_status: string;
  remote_episode: number;
  remote_status: string;
  provider: "ANILIST" | "MYANIMELIST";
  resolved_action?: "use_local" | "use_remote" | "keep_latest";
}

export interface ActiveSessionInfo {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  last_active: string;
  is_current: boolean;
}
