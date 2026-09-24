import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ConflictResolution {
  id: string; // anime slug or id
  choice: "use_local" | "use_remote" | "keep_latest";
}

function generateSlug(title: string): string {
  if (!title) return "anime";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ANILIST_STATUS_MAP: Record<string, string> = {
  CURRENT: "watching",
  PLANNING: "plan_to_watch",
  COMPLETED: "completed",
  DROPPED: "dropped",
  PAUSED: "on_hold",
  REPEATING: "watching",
};

const MAL_STATUS_MAP: Record<string, string> = {
  watching: "watching",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
  plan_to_watch: "plan_to_watch",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const providerTarget = body.provider || "ALL"; // 'ANILIST' | 'MYANIMELIST' | 'ALL'
    const resolutions: Record<string, "use_local" | "use_remote" | "keep_latest"> = body.resolutions || {};

    // 1. Fetch connected accounts
    let query = supabase.from("external_accounts").select("*").eq("user_id", user.id);
    if (providerTarget !== "ALL") {
      query = query.eq("provider", providerTarget);
    }
    const { data: accounts, error: accError } = await query;

    if (accError) throw accError;
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No connected anime accounts found to sync." },
        { status: 400 }
      );
    }

    // 2. Fetch local bookmarks
    const { data: localBookmarks } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id);

    const localMap = new Map<string, any>();
    (localBookmarks || []).forEach((b) => {
      localMap.set(b.anime_slug, b);
    });

    let totalSynced = 0;
    let totalProgressUpdates = 0;
    const detectedConflicts: any[] = [];

    for (const account of accounts) {
      const provider = account.provider;
      const token = account.access_token;
      if (!token) continue;

      if (provider === "ANILIST") {
        // Query current viewer's lists
        const viewerQuery = `
          query {
            Viewer {
              name
            }
          }
        `;
        const vRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: viewerQuery }),
        });

        if (!vRes.ok) {
          await supabase
            .from("external_accounts")
            .update({ status: "REAUTH_REQUIRED" })
            .eq("id", account.id);
          continue;
        }

        const vData = await vRes.json();
        const username = vData?.data?.Viewer?.name || account.username;

        const listQuery = `
          query ($userName: String) {
            MediaListCollection(userName: $userName, type: ANIME) {
              lists {
                status
                entries {
                  id
                  status
                  progress
                  score
                  updatedAt
                  media {
                    id
                    title {
                      english
                      romaji
                      native
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;

        const listRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: listQuery, variables: { userName: username } }),
        });

        const listData = await listRes.json();
        const rawLists = listData?.data?.MediaListCollection?.lists || [];

        const remoteEntries: any[] = [];
        for (const list of rawLists) {
          for (const entry of list.entries || []) {
            const m = entry.media;
            const title = m?.title?.english || m?.title?.romaji || m?.title?.native || "Anime";
            const slug = generateSlug(title);
            remoteEntries.push({
              id: entry.id,
              mediaId: m.id,
              title,
              slug,
              posterImage: m?.coverImage?.large || "",
              status: ANILIST_STATUS_MAP[entry.status] || "watching",
              progress: entry.progress || 0,
              score: entry.score || 0,
              updatedAt: entry.updatedAt,
            });
          }
        }

        // Compare local vs remote entries
        const toUpsertLocally: any[] = [];

        for (const remote of remoteEntries) {
          const local = localMap.get(remote.slug);

          if (!local) {
            // Import new anime from AniList into AniWaveX
            toUpsertLocally.push({
              user_id: user.id,
              anime_slug: remote.slug,
              anime_title: remote.title,
              poster_image: remote.posterImage,
              status: remote.status,
              last_episode_watched: remote.progress,
              updated_at: new Date().toISOString(),
            });
            totalSynced++;
          } else {
            const localProgress = local.last_episode_watched || 0;
            const remoteProgress = remote.progress || 0;

            if (localProgress !== remoteProgress || local.status !== remote.status) {
              const resolutionChoice = resolutions[remote.slug];

              if (!resolutionChoice) {
                // Register conflict for user decision
                detectedConflicts.push({
                  id: remote.slug,
                  title: remote.title,
                  poster_image: remote.posterImage,
                  local_episode: localProgress,
                  local_status: local.status,
                  remote_episode: remoteProgress,
                  remote_status: remote.status,
                  provider: "ANILIST",
                });
              } else if (resolutionChoice === "use_remote") {
                toUpsertLocally.push({
                  user_id: user.id,
                  anime_slug: remote.slug,
                  anime_title: remote.title,
                  poster_image: remote.posterImage,
                  status: remote.status,
                  last_episode_watched: remoteProgress,
                  updated_at: new Date().toISOString(),
                });
                totalProgressUpdates++;
              } else if (resolutionChoice === "use_local") {
                // Push local progress to AniList
                await pushProgressToAniList(token, remote.mediaId, localProgress, local.status);
                totalProgressUpdates++;
              } else if (resolutionChoice === "keep_latest") {
                if (localProgress >= remoteProgress) {
                  await pushProgressToAniList(token, remote.mediaId, localProgress, local.status);
                } else {
                  toUpsertLocally.push({
                    user_id: user.id,
                    anime_slug: remote.slug,
                    anime_title: remote.title,
                    poster_image: remote.posterImage,
                    status: remote.status,
                    last_episode_watched: remoteProgress,
                    updated_at: new Date().toISOString(),
                  });
                }
                totalProgressUpdates++;
              }
            }
          }
        }

        // Apply local database batch updates
        if (toUpsertLocally.length > 0) {
          const { error: batchErr } = await supabase
            .from("bookmarks")
            .upsert(toUpsertLocally, { onConflict: "user_id,anime_slug" });

          if (batchErr) {
            console.error("Local sync batch error:", batchErr);
          }
        }

        // Update last synced timestamp
        await supabase
          .from("external_accounts")
          .update({
            last_synced_at: new Date().toISOString(),
            status: "CONNECTED",
          })
          .eq("id", account.id);

        // Record history event
        await supabase.from("sync_history").insert({
          user_id: user.id,
          provider: "AniList",
          status: detectedConflicts.length > 0 ? "CONFLICT" : "SUCCESS",
          items_synced: toUpsertLocally.length,
          progress_updates: totalProgressUpdates,
          summary: `Synchronized ${toUpsertLocally.length} entries with AniList.`,
          details: { conflictsCount: detectedConflicts.length },
        });
      } else if (provider === "MYANIMELIST") {
        // Query MAL user's anime list
        const malRes = await fetch(
          "https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status{num_episodes_watched,status,score}&limit=1000",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!malRes.ok) {
          // If token expired, try to refresh if refresh_token exists
          if (malRes.status === 401 && account.refresh_token) {
            const refreshed = await refreshMalToken(account.id, account.refresh_token, supabase);
            if (!refreshed) {
              await supabase
                .from("external_accounts")
                .update({ status: "REAUTH_REQUIRED" })
                .eq("id", account.id);
              continue;
            }
          } else {
            await supabase
              .from("external_accounts")
              .update({ status: "ERROR" })
              .eq("id", account.id);
            continue;
          }
        } else {
          const malData = await malRes.json();
          const items = malData?.data || [];
          const toUpsertLocally: any[] = [];

          for (const item of items) {
            const node = item.node;
            const listStatus = item.list_status || {};
            const title = node?.title || "Anime";
            const slug = generateSlug(title);
            const posterImage = node?.main_picture?.large || node?.main_picture?.medium || "";
            const remoteStatus = MAL_STATUS_MAP[listStatus.status] || "watching";
            const remoteProgress = listStatus.num_episodes_watched || 0;

            const local = localMap.get(slug);

            if (!local) {
              toUpsertLocally.push({
                user_id: user.id,
                anime_slug: slug,
                anime_title: title,
                poster_image: posterImage,
                status: remoteStatus,
                last_episode_watched: remoteProgress,
                updated_at: new Date().toISOString(),
              });
              totalSynced++;
            } else {
              const localProgress = local.last_episode_watched || 0;
              if (localProgress !== remoteProgress || local.status !== remoteStatus) {
                const resolutionChoice = resolutions[slug];
                if (!resolutionChoice) {
                  detectedConflicts.push({
                    id: slug,
                    title,
                    poster_image: posterImage,
                    local_episode: localProgress,
                    local_status: local.status,
                    remote_episode: remoteProgress,
                    remote_status: remoteStatus,
                    provider: "MYANIMELIST",
                  });
                } else if (resolutionChoice === "use_remote") {
                  toUpsertLocally.push({
                    user_id: user.id,
                    anime_slug: slug,
                    anime_title: title,
                    poster_image: posterImage,
                    status: remoteStatus,
                    last_episode_watched: remoteProgress,
                    updated_at: new Date().toISOString(),
                  });
                  totalProgressUpdates++;
                }
              }
            }
          }

          if (toUpsertLocally.length > 0) {
            await supabase
              .from("bookmarks")
              .upsert(toUpsertLocally, { onConflict: "user_id,anime_slug" });
          }

          await supabase
            .from("external_accounts")
            .update({
              last_synced_at: new Date().toISOString(),
              status: "CONNECTED",
            })
            .eq("id", account.id);

          await supabase.from("sync_history").insert({
            user_id: user.id,
            provider: "MyAnimeList",
            status: detectedConflicts.length > 0 ? "CONFLICT" : "SUCCESS",
            items_synced: toUpsertLocally.length,
            progress_updates: totalProgressUpdates,
            summary: `Synchronized ${toUpsertLocally.length} entries with MyAnimeList.`,
            details: { conflictsCount: detectedConflicts.length },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items_synced: totalSynced,
      progress_updates: totalProgressUpdates,
      conflicts: detectedConflicts,
      message:
        detectedConflicts.length > 0
          ? `Sync completed with ${detectedConflicts.length} item conflicts to resolve.`
          : `Sync completed successfully! ${totalSynced} items synchronized.`,
    });
  } catch (err: any) {
    console.error("Sync API error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute sync" }, { status: 500 });
  }
}

async function pushProgressToAniList(token: string, mediaId: number, progress: number, statusStr: string) {
  let statusEnum = "CURRENT";
  if (statusStr === "completed") statusEnum = "COMPLETED";
  if (statusStr === "plan_to_watch") statusEnum = "PLANNING";
  if (statusStr === "on_hold") statusEnum = "PAUSED";
  if (statusStr === "dropped") statusEnum = "DROPPED";

  const mutation = `
    mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
        id
        progress
      }
    }
  `;

  await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: mutation,
      variables: { mediaId, progress, status: statusEnum },
    }),
  }).catch(() => null);
}

async function refreshMalToken(accountId: string, refreshToken: string, supabase: any): Promise<boolean> {
  try {
    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "073be04d9cfc6030e37926ae343e37f3";
    const clientSecret = process.env.MAL_CLIENT_SECRET || "";

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    if (clientSecret) {
      bodyParams.set("client_secret", clientSecret);
    }

    const res = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.access_token) return false;

    await supabase
      .from("external_accounts")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
        status: "CONNECTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    return true;
  } catch {
    return false;
  }
}
