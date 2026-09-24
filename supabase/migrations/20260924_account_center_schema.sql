-- Migration: 20260924_account_center_schema.sql
-- Description: Complete schema for AniWaveX User Profile & Account Center

-- 1. Extend profiles table with display_name, custom_avatar_url, privacy_settings, and notification_settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile": "public", "watchlist": "public", "activity": "public"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"anime": true, "episodes": true, "sync": true, "security": true}'::jsonb;

-- Populate display_name with username where display_name is null
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL;

-- 2. Create external_accounts table for AniList & MyAnimeList connections
CREATE TABLE IF NOT EXISTS public.external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('ANILIST', 'MYANIMELIST')),
  provider_user_id TEXT,
  username TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'SYNCING', 'ERROR')),
  sync_settings JSONB DEFAULT '{"sync_status": true, "sync_progress": true, "sync_scores": true, "direction": "two_way"}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

-- Index for external_accounts user lookups
CREATE INDEX IF NOT EXISTS idx_external_accounts_user_id ON public.external_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_external_accounts_provider ON public.external_accounts (user_id, provider);

-- RLS for external_accounts
ALTER TABLE public.external_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own external accounts" ON public.external_accounts;
CREATE POLICY "Users can view their own external accounts"
  ON public.external_accounts FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own external accounts" ON public.external_accounts;
CREATE POLICY "Users can insert their own external accounts"
  ON public.external_accounts FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own external accounts" ON public.external_accounts;
CREATE POLICY "Users can update their own external accounts"
  ON public.external_accounts FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own external accounts" ON public.external_accounts;
CREATE POLICY "Users can delete their own external accounts"
  ON public.external_accounts FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 3. Create sync_history table for tracking synchronization events
CREATE TABLE IF NOT EXISTS public.sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'CONFLICT')),
  items_synced INT DEFAULT 0,
  progress_updates INT DEFAULT 0,
  summary TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for sync_history
CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON public.sync_history (user_id, created_at DESC);

-- RLS for sync_history
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sync history" ON public.sync_history;
CREATE POLICY "Users can view their own sync history"
  ON public.sync_history FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own sync history" ON public.sync_history;
CREATE POLICY "Users can insert their own sync history"
  ON public.sync_history FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own sync history" ON public.sync_history;
CREATE POLICY "Users can delete their own sync history"
  ON public.sync_history FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 4. Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS policies for avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
