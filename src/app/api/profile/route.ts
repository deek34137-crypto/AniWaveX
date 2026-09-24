import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallel fetch profile, bookmarks, and watch history
    const [profileRes, bookmarksRes, historyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("bookmarks").select("status, anime_slug").eq("user_id", user.id),
      supabase.from("watch_history").select("anime_slug, last_episode_watched, progress_seconds").eq("user_id", user.id),
    ]);

    const profile = profileRes.data || {};
    const bookmarks = bookmarksRes.data || [];
    const history = historyRes.data || [];

    // Compute real statistics without fabrication
    const distinctWatchedAnime = new Set(history.map((h) => h.anime_slug).filter(Boolean));
    const totalEpisodesWatched = history.reduce((sum, h) => sum + (h.last_episode_watched || 1), 0);
    const totalWatchTimeSeconds = history.reduce((sum, h) => sum + (h.progress_seconds || 0), 0);

    const completedCount = bookmarks.filter((b) => b.status === "completed").length;
    const watchingCount = bookmarks.filter((b) => b.status === "watching").length;
    const planToWatchCount = bookmarks.filter((b) => b.status === "plan_to_watch").length;

    const stats = {
      anime_watched: distinctWatchedAnime.size,
      episodes_watched: totalEpisodesWatched,
      completed: completedCount,
      currently_watching: watchingCount,
      plan_to_watch: planToWatchCount,
      watch_time_seconds: totalWatchTimeSeconds,
      favorites_count: Array.isArray(profile.top_five_anime) ? profile.top_five_anime.length : 0,
    };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      },
      profile: {
        username: profile.username || user.email?.split("@")[0] || "User",
        display_name: profile.display_name || profile.username || user.email?.split("@")[0] || "User",
        bio: profile.bio || "",
        avatar_id: profile.avatar_id || user.user_metadata?.avatar_id || "avatar_01",
        custom_avatar_url: profile.custom_avatar_url || null,
        banner_preset: profile.banner_preset || "cyberpunk",
        custom_banner_url: profile.custom_banner_url || "",
        top_five_anime: profile.top_five_anime || [],
        privacy_settings: profile.privacy_settings || {
          profile: "public",
          watchlist: "public",
          activity: "public",
        },
        notification_settings: profile.notification_settings || {
          anime: true,
          episodes: true,
          sync: true,
          security: true,
        },
      },
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      display_name,
      username,
      bio,
      banner_preset,
      custom_banner_url,
      privacy_settings,
      notification_settings,
      top_five_anime,
    } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const authMetaUpdates: Record<string, any> = {};

    // Validate and process username if provided
    if (username !== undefined) {
      const cleanUsername = String(username).trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        return NextResponse.json(
          { error: "Username must be between 3 and 25 characters." },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, underscores, and hyphens." },
          { status: 400 }
        );
      }

      // Check uniqueness against other users
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: "This username is already taken by another user." },
          { status: 409 }
        );
      }

      updates.username = cleanUsername;
      updates.username_lower = cleanUsername.toLowerCase();
      authMetaUpdates.username = cleanUsername;
    }

    // Display Name
    if (display_name !== undefined) {
      const cleanDisplayName = String(display_name).trim().slice(0, 50);
      updates.display_name = cleanDisplayName || updates.username || user.email?.split("@")[0] || "User";
      authMetaUpdates.display_name = updates.display_name;
    }

    // Bio
    if (bio !== undefined) {
      updates.bio = String(bio).slice(0, 300);
      authMetaUpdates.bio = updates.bio;
    }

    // Banner
    if (banner_preset !== undefined) {
      updates.banner_preset = banner_preset;
      authMetaUpdates.banner_preset = banner_preset;
    }
    if (custom_banner_url !== undefined) {
      updates.custom_banner_url = custom_banner_url;
      authMetaUpdates.custom_banner_url = custom_banner_url;
    }

    // Top five anime
    if (top_five_anime !== undefined && Array.isArray(top_five_anime)) {
      updates.top_five_anime = top_five_anime.slice(0, 5);
      authMetaUpdates.top_five_anime = updates.top_five_anime;
    }

    // Privacy & Notifications
    if (privacy_settings !== undefined) {
      updates.privacy_settings = privacy_settings;
    }
    if (notification_settings !== undefined) {
      updates.notification_settings = notification_settings;
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates }, { onConflict: "id" });

    if (profileError) {
      throw profileError;
    }

    // Sync metadata to auth.users
    if (Object.keys(authMetaUpdates).length > 0) {
      await supabase.auth.updateUser({
        data: authMetaUpdates,
      });
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
