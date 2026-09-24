-- Migration: 20260924_live_progress_sync_schema.sql
-- Description: Schema for Live Playback Progress Sync to AniList & MyAnimeList

-- 1. Anime Mappings Table
CREATE TABLE IF NOT EXISTS public.anime_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_slug TEXT NOT NULL UNIQUE,
  kitsu_id TEXT,
  anilist_id INT,
  mal_id INT,
  title TEXT,
  total_episodes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anime_mappings_slug ON public.anime_mappings (anime_slug);
CREATE INDEX IF NOT EXISTS idx_anime_mappings_anilist ON public.anime_mappings (anilist_id);
CREATE INDEX IF NOT EXISTS idx_anime_mappings_mal ON public.anime_mappings (mal_id);

ALTER TABLE public.anime_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of anime mappings" ON public.anime_mappings;
CREATE POLICY "Allow public read of anime mappings" ON public.anime_mappings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert/update of anime mappings" ON public.anime_mappings;
CREATE POLICY "Allow authenticated insert/update of anime mappings" ON public.anime_mappings FOR ALL USING (auth.role() = 'authenticated');

-- 2. Sync Jobs Queue Table
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_slug TEXT NOT NULL,
  anime_title TEXT,
  episode_number INT NOT NULL,
  total_episodes INT,
  provider TEXT NOT NULL CHECK (provider IN ('ANILIST', 'MYANIMELIST')),
  operation TEXT NOT NULL DEFAULT 'UPDATE_PROGRESS',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING', 'REAUTH_REQUIRED')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  error TEXT,
  source TEXT NOT NULL DEFAULT 'ANIWAVEX',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_status ON public.sync_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending ON public.sync_jobs (status, next_retry_at) WHERE status IN ('PENDING', 'RETRYING');

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sync jobs" ON public.sync_jobs;
CREATE POLICY "Users can manage their own sync jobs" ON public.sync_jobs FOR ALL USING ((SELECT auth.uid()) = user_id);

-- 3. Sync Conflicts Table
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_slug TEXT NOT NULL,
  anime_title TEXT,
  local_progress INT NOT NULL,
  anilist_progress INT,
  mal_progress INT,
  status TEXT NOT NULL DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'RESOLVED')),
  resolution_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user ON public.sync_conflicts (user_id, status);

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sync conflicts" ON public.sync_conflicts;
CREATE POLICY "Users can manage their own sync conflicts" ON public.sync_conflicts FOR ALL USING ((SELECT auth.uid()) = user_id);

-- 4. Extend watch_history with completion tracking
ALTER TABLE public.watch_history
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
