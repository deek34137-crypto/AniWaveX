-- Update handle_new_user trigger default avatar to 'avatar_01'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  extracted_username TEXT;
BEGIN
  extracted_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, bio, avatar_id, banner_preset, top_five_anime)
  VALUES (
    NEW.id,
    extracted_username,
    COALESCE(NEW.raw_user_meta_data->>'bio', 'Passionate anime fan exploring the finest series and movies on AniWaveX.'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_id', 'avatar_01'),
    COALESCE(NEW.raw_user_meta_data->>'banner_preset', 'cyberpunk'),
    COALESCE(NEW.raw_user_meta_data->'top_five_anime', '[]'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    bio = COALESCE(NEW.raw_user_meta_data->>'bio', profiles.bio),
    avatar_id = COALESCE(NEW.raw_user_meta_data->>'avatar_id', profiles.avatar_id),
    banner_preset = COALESCE(NEW.raw_user_meta_data->>'banner_preset', profiles.banner_preset),
    custom_banner_url = COALESCE(NEW.raw_user_meta_data->>'custom_banner_url', profiles.custom_banner_url),
    top_five_anime = COALESCE(NEW.raw_user_meta_data->'top_five_anime', profiles.top_five_anime),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
