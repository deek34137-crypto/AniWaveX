-- Migration: Fix Heartbeat FK Violation & Add Safe Public Concurrent Counter
-- Description:
-- 1. Validates user_id against auth.users in record_heartbeat to prevent foreign key violation 500 errors.
-- 2. Adds get_concurrent_users_count() allowing anon and public visitors to query online count without 403 errors or data leakage.

CREATE OR REPLACE FUNCTION public.record_heartbeat(
  p_visitor_id text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_current_path text DEFAULT '/'::text, 
  p_device_type text DEFAULT 'desktop'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Validate foreign key constraint for user_id to prevent FK violation error
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    p_user_id := NULL;
  END IF;

  -- Upsert heartbeat record
  INSERT INTO public.heartbeats (
    visitor_id,
    user_id,
    current_path,
    device_type,
    created_at,
    last_seen_at,
    first_seen_date,
    last_seen_date
  )
  VALUES (
    p_visitor_id,
    p_user_id,
    p_current_path,
    p_device_type,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    v_today,
    v_today
  )
  ON CONFLICT (visitor_id) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.heartbeats.user_id),
    current_path = EXCLUDED.current_path,
    device_type = EXCLUDED.device_type,
    last_seen_at = timezone('utc'::text, now()),
    last_seen_date = v_today;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_concurrent_users_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.heartbeats
  WHERE last_seen_at >= (timezone('utc'::text, now()) - INTERVAL '2 minutes');
$$;

GRANT EXECUTE ON FUNCTION public.get_concurrent_users_count() TO anon, authenticated, service_role;
