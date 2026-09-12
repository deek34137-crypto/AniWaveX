-- 1. Covering indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_heartbeats_user_id ON public.heartbeats (user_id);
CREATE INDEX IF NOT EXISTS idx_tier_list_likes_user_id ON public.tier_list_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_tier_lists_user_id ON public.tier_lists (user_id);

-- 2. Profiles RLS InitPlan optimization
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

-- 3. Bookmarks RLS InitPlan optimization
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update their own bookmarks" ON public.bookmarks FOR UPDATE USING ((select auth.uid()) = user_id);

-- 4. Tier List Likes RLS InitPlan optimization
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.tier_list_likes;
CREATE POLICY "Users can delete their own likes" ON public.tier_list_likes FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.tier_list_likes;
CREATE POLICY "Users can insert their own likes" ON public.tier_list_likes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- 5. Tier Lists RLS InitPlan optimization
DROP POLICY IF EXISTS "Public tier lists are viewable by everyone" ON public.tier_lists;
CREATE POLICY "Public tier lists are viewable by everyone" ON public.tier_lists FOR SELECT USING (is_public = true OR (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own tier lists" ON public.tier_lists;
CREATE POLICY "Users can delete their own tier lists" ON public.tier_lists FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert tier lists" ON public.tier_lists;
CREATE POLICY "Users can insert tier lists" ON public.tier_lists FOR INSERT WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own tier lists" ON public.tier_lists;
CREATE POLICY "Users can update their own tier lists" ON public.tier_lists FOR UPDATE USING ((select auth.uid()) = user_id OR (user_id IS NULL AND (select auth.uid()) IS NULL));

-- 6. Watch History RLS InitPlan optimization
DROP POLICY IF EXISTS "Users can delete their own watch history" ON public.watch_history;
CREATE POLICY "Users can delete their own watch history" ON public.watch_history FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own watch history" ON public.watch_history;
CREATE POLICY "Users can insert their own watch history" ON public.watch_history FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own watch history" ON public.watch_history;
CREATE POLICY "Users can update their own watch history" ON public.watch_history FOR UPDATE USING ((select auth.uid()) = user_id);
