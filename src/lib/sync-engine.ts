/**
 * Enhanced AniList & MyAnimeList 2-Way Sync Engine for AniWaveX
 * Features:
 * - AniList OAuth Token management & Direct GraphQL Mutations
 * - MyAnimeList OAuth PKCE flow (code_verifier / code_challenge)
 * - 3-Way Diff Comparison: IMPORT, EXPORT, CONFLICT
 * - Safe user preview before any destructive or overwriting mutation
 */

import { fetchAniListGraphQL } from "@/lib/schedule";
import { WatchlistStatus } from "@/lib/watchlist";

export interface SyncDiffItem {
  id: string;
  anilistId?: number;
  malId?: number;
  title: string;
  posterImage: string;
  direction: 'import' | 'export' | 'in_sync' | 'conflict';
  localStatus?: WatchlistStatus;
  localProgress?: number;
  remoteStatus?: string;
  remoteProgress?: number;
  actionSummary: string;
}

export const ANILIST_TOKEN_KEY = "aniwavex_anilist_token";
export const MAL_TOKEN_KEY = "aniwavex_mal_token";
export const MAL_CODE_VERIFIER_KEY = "aniwavex_mal_code_verifier";

// AniList Client ID (Configurable via env)
export const ANILIST_CLIENT_ID = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "51864";
export const MAL_CLIENT_ID = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "073be04d9cfc6030e37926ae343e37f3";

/**
 * Generate AniList OAuth Authorization URL (Implicit Grant for direct mobile/web token return)
 */
export function getAniListAuthUrl(redirectUri?: string): string {
  const uri = redirectUri || (typeof window !== "undefined" ? `${window.location.origin}/profile` : "https://aniwavex.bond/profile");
  return `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&redirect_uri=${encodeURIComponent(uri)}&response_type=code`;
}

/**
 * Generate MAL OAuth PKCE Authorization URL
 */
export function getMalAuthUrl(redirectUri?: string): string {
  if (typeof window === "undefined") return "";
  const uri = redirectUri || `${window.location.origin}/profile`;
  
  // 128 char code verifier
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-2)).join('');
  localStorage.setItem(MAL_CODE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: MAL_CLIENT_ID,
    code_challenge: codeVerifier,
    code_challenge_method: "plain",
    redirect_uri: uri,
    state: "aniwavex_mal_auth",
  });

  return `https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`;
}

/**
 * Compare local watchlist with remote entries to produce a safe 2-way sync preview
 */
export function buildSyncDiff(
  localWatchlist: { anime_slug: string; anime_title: string; poster_image: string; status: WatchlistStatus; progress?: number }[],
  remoteEntries: { id: number; title: string; posterImage: string; status: string; progress: number }[]
): SyncDiffItem[] {
  const diffs: SyncDiffItem[] = [];
  const remoteMap = new Map<string, typeof remoteEntries[0]>();

  for (const r of remoteEntries) {
    remoteMap.set(r.title.toLowerCase().trim(), r);
  }

  // 1. Check local items against remote
  for (const local of localWatchlist) {
    const key = local.anime_title.toLowerCase().trim();
    const remote = remoteMap.get(key);

    if (!remote) {
      diffs.push({
        id: local.anime_slug,
        title: local.anime_title,
        posterImage: local.poster_image,
        direction: 'export',
        localStatus: local.status,
        localProgress: local.progress || 0,
        actionSummary: `Export to remote (${local.status}, Ep ${local.progress || 0})`,
      });
    } else {
      remoteMap.delete(key);
      const isProgressDiff = (local.progress || 0) !== remote.progress;
      const isStatusDiff = local.status.toLowerCase() !== remote.status.toLowerCase();

      if (isProgressDiff || isStatusDiff) {
        diffs.push({
          id: local.anime_slug,
          anilistId: remote.id,
          title: local.anime_title,
          posterImage: local.poster_image || remote.posterImage,
          direction: 'conflict',
          localStatus: local.status,
          localProgress: local.progress || 0,
          remoteStatus: remote.status,
          remoteProgress: remote.progress,
          actionSummary: `Conflict: Local Ep ${local.progress || 0} vs Remote Ep ${remote.progress}`,
        });
      } else {
        diffs.push({
          id: local.anime_slug,
          anilistId: remote.id,
          title: local.anime_title,
          posterImage: local.poster_image,
          direction: 'in_sync',
          localStatus: local.status,
          localProgress: local.progress,
          remoteStatus: remote.status,
          remoteProgress: remote.progress,
          actionSummary: 'Already in sync',
        });
      }
    }
  }

  // 2. Remaining remote items to import locally
  for (const [_, remote] of remoteMap.entries()) {
    diffs.push({
      id: `remote-${remote.id}`,
      anilistId: remote.id,
      title: remote.title,
      posterImage: remote.posterImage,
      direction: 'import',
      remoteStatus: remote.status,
      remoteProgress: remote.progress,
      actionSummary: `Import locally (${remote.status}, Ep ${remote.progress})`,
    });
  }

  return diffs;
}

/**
 * Execute mutations to AniList GraphQL for a confirmed batch of items
 */
export async function applyAniListSync(
  token: string,
  items: SyncDiffItem[]
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const item of items) {
    if (item.direction === 'in_sync' || !item.anilistId) continue;

    const mutation = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
        SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
          id
          progress
          status
        }
      }
    `;

    // Map local status to AniList GraphQL enum
    let statusEnum = "CURRENT";
    if (item.localStatus === "completed") statusEnum = "COMPLETED";
    if (item.localStatus === "plan_to_watch") statusEnum = "PLANNING";
    if (item.localStatus === "on_hold") statusEnum = "PAUSED";
    if (item.localStatus === "dropped") statusEnum = "DROPPED";

    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            mediaId: item.anilistId,
            progress: item.localProgress || 0,
            status: statusEnum,
          },
        }),
      });

      if (res.ok) {
        successful++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { successful, failed };
}
