-- Migration: Harden RPC Functions & Revoke Public/Anon Access
-- Description:
-- 1. Prevents anon role from executing get_heartbeat_analytics() via PostgREST RPC.
-- 2. Enforces JWT-level admin authorization inside get_heartbeat_analytics().
-- 3. Revokes execute privileges on internal trigger functions (handle_new_user, update_tier_list_likes_count).
-- 4. Pins search_path to 'public, pg_temp' on all SECURITY DEFINER functions to prevent search_path hijacking.

-- 1. Update get_heartbeat_analytics with search_path and authorization check
CREATE OR REPLACE FUNCTION public.get_heartbeat_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_concurrent_users INTEGER;
  v_daily_unique_users INTEGER;
  v_total_unique_users INTEGER;
  v_today DATE := CURRENT_DATE;
  v_top_pages JSONB;
  v_recent_daily_trend JSONB;
BEGIN
  -- Security check: Allow service_role OR verified admin users
  IF (auth.role() <> 'service_role') THEN
    IF (auth.role() <> 'authenticated') THEN
      RAISE EXCEPTION 'Access denied: Authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT (
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
      OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('deek34137@gmail.com', 'abhiy637hw@gmail.com')
    ) THEN
      RAISE EXCEPTION 'Access denied: Admin privileges required' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 1. Active Concurrent Users in the last 2 minutes
  SELECT COUNT(*)
  INTO v_concurrent_users
  FROM public.heartbeats
  WHERE last_seen_at >= (timezone('utc'::text, now()) - INTERVAL '2 minutes');

  -- 2. Daily Unique Users today
  SELECT COUNT(*)
  INTO v_daily_unique_users
  FROM public.heartbeats
  WHERE last_seen_date = v_today;

  -- 3. Total Unique Users (All-time unique visitors)
  SELECT COUNT(*)
  INTO v_total_unique_users
  FROM public.heartbeats;

  -- 4. Top 5 active pages right now
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_top_pages
  FROM (
    SELECT current_path, COUNT(*) AS active_count
    FROM public.heartbeats
    WHERE last_seen_at >= (timezone('utc'::text, now()) - INTERVAL '5 minutes')
      AND current_path IS NOT NULL
    GROUP BY current_path
    ORDER BY active_count DESC
    LIMIT 5
  ) sub;

  -- 5. Daily unique user trend (last 7 days)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_recent_daily_trend
  FROM (
    SELECT last_seen_date AS date, COUNT(DISTINCT visitor_id) AS unique_users
    FROM public.heartbeats
    WHERE last_seen_date >= (v_today - INTERVAL '7 days')
    GROUP BY last_seen_date
    ORDER BY last_seen_date ASC
  ) sub;

  RETURN jsonb_build_object(
    'concurrentUsers', v_concurrent_users,
    'dailyUniqueUsers', v_daily_unique_users,
    'totalUniqueUsers', v_total_unique_users,
    'topPages', v_top_pages,
    'dailyTrend', v_recent_daily_trend,
    'serverTime', timezone('utc'::text, now())
  );
END;
$$;

-- 2. Revoke execute on get_heartbeat_analytics from public and anon
REVOKE EXECUTE ON FUNCTION public.get_heartbeat_analytics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_heartbeat_analytics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_heartbeat_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_heartbeat_analytics() TO service_role;

-- 3. Revoke execute on trigger functions from public, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_tier_list_likes_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_tier_list_likes_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_tier_list_likes_count() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_tier_list_likes_count() TO service_role;

-- 4. Set search_path on remaining functions to prevent search_path escalation
ALTER FUNCTION public.record_heartbeat(text, uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tier_list_likes_count() SET search_path = public, pg_temp;
