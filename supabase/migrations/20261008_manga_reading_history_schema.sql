-- Migration: 20261008_manga_reading_history_schema.sql
-- Description: Schema for Manga Reading Progress & History Tracking in Supabase

CREATE TABLE IF NOT EXISTS public.manga_reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL,
  manga_title TEXT NOT NULL,
  poster_image TEXT,
  chapter_id TEXT NOT NULL,
  chapter_number NUMERIC NOT NULL,
  page_number INT NOT NULL DEFAULT 1,
  total_pages INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  reading_mode TEXT DEFAULT 'webtoon' CHECK (reading_mode IN ('webtoon', 'paged-rtl', 'paged-ltr')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_manga UNIQUE (user_id, manga_id)
);

CREATE INDEX IF NOT EXISTS idx_manga_reading_history_user ON public.manga_reading_history (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_manga_reading_history_lookup ON public.manga_reading_history (user_id, manga_id);

ALTER TABLE public.manga_reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own manga reading history" ON public.manga_reading_history;
CREATE POLICY "Users can view their own manga reading history"
  ON public.manga_reading_history FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own manga reading history" ON public.manga_reading_history;
CREATE POLICY "Users can insert their own manga reading history"
  ON public.manga_reading_history FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own manga reading history" ON public.manga_reading_history;
CREATE POLICY "Users can update their own manga reading history"
  ON public.manga_reading_history FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own manga reading history" ON public.manga_reading_history;
CREATE POLICY "Users can delete their own manga reading history"
  ON public.manga_reading_history FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
