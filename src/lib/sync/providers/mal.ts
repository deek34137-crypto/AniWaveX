import { SupabaseClient } from '@supabase/supabase-js';
import { ProviderSyncStatus } from '@/types/sync';

interface UpdateMALProgressParams {
  supabase: SupabaseClient;
  userId: string;
  malAnimeId: number;
  episodeNumber: number;
  totalEpisodes?: number | null;
  animeTitle?: string;
}

export class MALSyncProvider {
  /**
   * Refresh MAL access token using refresh_token if expired or close to expiry.
   */
  private static async getValidAccessToken(
    supabase: SupabaseClient,
    account: any
  ): Promise<string | null> {
    const now = Date.now();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
    const isCloseToExpiry = expiresAt > 0 && expiresAt - now < 60 * 1000;

    if (!isCloseToExpiry && account.access_token) {
      return account.access_token;
    }

    if (!account.refresh_token) {
      return account.access_token || null;
    }

    // Refresh token with MAL OAuth endpoint
    try {
      const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || '073be04d9cfc6030e37926ae343e37f3';
      const clientSecret = process.env.MAL_CLIENT_SECRET || '';

      const bodyParams = new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      });

      if (clientSecret) {
        bodyParams.set('client_secret', clientSecret);
      }

      const res = await fetch('https://myanimelist.net/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        console.error('[MALSyncProvider] Token refresh failed with status:', res.status);
        await supabase
          .from('external_accounts')
          .update({ status: 'REAUTH_REQUIRED', updated_at: new Date().toISOString() })
          .eq('id', account.id);
        return null;
      }

      const data = await res.json();
      if (!data.access_token) {
        await supabase
          .from('external_accounts')
          .update({ status: 'REAUTH_REQUIRED', updated_at: new Date().toISOString() })
          .eq('id', account.id);
        return null;
      }

      const newExpiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null;

      // Update in Supabase
      await supabase
        .from('external_accounts')
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token || account.refresh_token,
          token_expires_at: newExpiresAt,
          status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      return data.access_token;
    } catch (err) {
      console.error('[MALSyncProvider] Error refreshing token:', err);
      return null;
    }
  }

  /**
   * Update episode progress and watch status on user's MyAnimeList list.
   */
  static async updateProgress({
    supabase,
    userId,
    malAnimeId,
    episodeNumber,
    totalEpisodes,
    animeTitle,
  }: UpdateMALProgressParams): Promise<ProviderSyncStatus> {
    if (!malAnimeId || malAnimeId <= 0) {
      return {
        status: 'FAILED',
        message: 'Invalid MyAnimeList anime ID',
      };
    }

    try {
      // 1. Fetch user's MAL account
      const { data: account, error: accError } = await supabase
        .from('external_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'MYANIMELIST')
        .maybeSingle();

      if (accError || !account) {
        return {
          status: 'NOT_CONNECTED',
          message: 'MyAnimeList account not connected',
        };
      }

      if (account.status === 'REAUTH_REQUIRED') {
        return {
          status: 'REAUTH_REQUIRED',
          message: 'MyAnimeList authentication expired. Reconnection required.',
        };
      }

      // 2. Obtain valid access token (auto-refresh if expired)
      const accessToken = await this.getValidAccessToken(supabase, account);
      if (!accessToken) {
        return {
          status: 'REAUTH_REQUIRED',
          message: 'MyAnimeList session expired. Please reconnect.',
        };
      }

      // 3. Determine MAL status
      const isCompleted = Boolean(totalEpisodes && episodeNumber >= totalEpisodes);
      const malStatus = isCompleted ? 'completed' : 'watching';

      // 4. Send PATCH to MAL API v2
      const bodyParams = new URLSearchParams({
        num_watched_episodes: String(episodeNumber),
        status: malStatus,
      });

      const res = await fetch(`https://api.myanimelist.net/v2/anime/${malAnimeId}/my_list_status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`,
        },
        body: bodyParams.toString(),
      });

      const json = await res.json().catch(() => ({}));

      // 5. Handle auth or permission error
      if (res.status === 401 || res.status === 403) {
        await supabase
          .from('external_accounts')
          .update({ status: 'REAUTH_REQUIRED', updated_at: new Date().toISOString() })
          .eq('id', account.id);

        return {
          status: 'REAUTH_REQUIRED',
          message: 'MyAnimeList session expired. Please reconnect.',
        };
      }

      if (!res.ok) {
        const errMsg = json.message || json.error || `MAL API error (${res.status})`;
        return {
          status: 'FAILED',
          message: errMsg,
        };
      }

      // 6. Update last_synced_at
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
        message: `MyAnimeList updated to Episode ${episodeNumber} (${malStatus})`,
        progress: json.num_episodes_watched ?? episodeNumber,
      };
    } catch (err: any) {
      console.error('[MALSyncProvider] Network or server error:', err);
      return {
        status: 'FAILED',
        message: err.message || 'Network error syncing with MyAnimeList',
      };
    }
  }
}
