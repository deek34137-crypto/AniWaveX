import { SupabaseClient } from '@supabase/supabase-js';
import { ProviderSyncStatus } from '@/types/sync';

interface UpdateAniListProgressParams {
  supabase: SupabaseClient;
  userId: string;
  anilistMediaId: number;
  episodeNumber: number;
  totalEpisodes?: number | null;
  animeTitle?: string;
}

export class AniListSyncProvider {
  /**
   * Update episode progress and watch status on user's AniList list.
   */
  static async updateProgress({
    supabase,
    userId,
    anilistMediaId,
    episodeNumber,
    totalEpisodes,
    animeTitle,
  }: UpdateAniListProgressParams): Promise<ProviderSyncStatus> {
    if (!anilistMediaId || anilistMediaId <= 0) {
      return {
        status: 'FAILED',
        message: 'Invalid AniList media ID',
      };
    }

    try {
      // 1. Fetch user's AniList credentials from external_accounts
      const { data: account, error: accError } = await supabase
        .from('external_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'ANILIST')
        .maybeSingle();

      if (accError || !account || !account.access_token) {
        return {
          status: 'NOT_CONNECTED',
          message: 'AniList account not connected',
        };
      }

      if (account.status === 'REAUTH_REQUIRED') {
        return {
          status: 'REAUTH_REQUIRED',
          message: 'AniList authentication expired. Reconnection required.',
        };
      }

      // 2. Determine watch status
      const isCompleted = Boolean(totalEpisodes && episodeNumber >= totalEpisodes);
      const mediaListStatus = isCompleted ? 'COMPLETED' : 'CURRENT';

      // 3. GraphQL Mutation
      const mutation = `
        mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
          SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
            id
            mediaId
            status
            progress
            updatedAt
          }
        }
      `;

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${account.access_token}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            mediaId: anilistMediaId,
            progress: episodeNumber,
            status: mediaListStatus,
          },
        }),
      });

      const json = await res.json();

      // 4. Handle authentication failure
      if (res.status === 401 || res.status === 403) {
        await supabase
          .from('external_accounts')
          .update({ status: 'REAUTH_REQUIRED', updated_at: new Date().toISOString() })
          .eq('id', account.id);

        return {
          status: 'REAUTH_REQUIRED',
          message: 'AniList session expired. Please reconnect.',
        };
      }

      if (!res.ok || json.errors) {
        const errMsg = json.errors?.[0]?.message || `AniList API error (${res.status})`;
        // Check if error is token related
        if (errMsg.toLowerCase().includes('invalid token') || errMsg.toLowerCase().includes('unauthenticated')) {
          await supabase
            .from('external_accounts')
            .update({ status: 'REAUTH_REQUIRED', updated_at: new Date().toISOString() })
            .eq('id', account.id);

          return {
            status: 'REAUTH_REQUIRED',
            message: 'AniList session expired. Please reconnect.',
          };
        }

        return {
          status: 'FAILED',
          message: errMsg,
        };
      }

      const entry = json.data?.SaveMediaListEntry;

      // 5. Update last_synced_at on external_accounts
      await supabase
        .from('external_accounts')
        .update({
          last_synced_at: new Date().toISOString(),
          status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      return {
        status: 'SUCCESS',
        message: `AniList updated to Episode ${episodeNumber} (${mediaListStatus})`,
        progress: entry?.progress ?? episodeNumber,
      };
    } catch (err: any) {
      console.error('[AniListSyncProvider] Network or server error:', err);
      return {
        status: 'FAILED',
        message: err.message || 'Network error syncing with AniList',
      };
    }
  }
}
