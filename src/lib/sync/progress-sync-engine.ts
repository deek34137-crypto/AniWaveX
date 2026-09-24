import { SupabaseClient } from '@supabase/supabase-js';
import { PlaybackSession, LiveSyncResult, ProviderSyncStatus } from '@/types/sync';
import { resolveAnimeMapping } from './anime-mapping';
import { AniListSyncProvider } from './providers/anilist';
import { MALSyncProvider } from './providers/mal';

const COMPLETION_THRESHOLD = 0.88; // 88% watched marks episode as completed

export class ProgressSyncEngine {
  /**
   * Process a live playback session:
   * 1. Updates AniWaveX local watch progress in Supabase FIRST.
   * 2. If episode reached completion threshold (or is completed), synchronizes with connected external services.
   * 3. Prevents sync loops using source tracking ('ANIWAVEX').
   */
  static async processPlaybackSession(
    supabase: SupabaseClient,
    userId: string,
    session: PlaybackSession
  ): Promise<LiveSyncResult> {
    const nowIso = new Date().toISOString();
    const episodeNum = Math.max(1, Math.floor(session.episodeNumber || 1));
    const floorPos = Math.max(0, Math.floor(session.lastPosition || 0));
    const floorDur = Math.max(0, Math.floor(session.duration || 0));

    // Determine completion: explicit completed flag OR passed 88% of video duration
    const isCompleted =
      session.completed ||
      (floorDur > 60 && floorPos / floorDur >= COMPLETION_THRESHOLD);

    // ── 1. Update AniWaveX Local Progress FIRST ──
    const localPayload: any = {
      user_id: userId,
      anime_slug: session.animeSlug,
      anime_title: session.animeTitle,
      poster_image: session.animePosterImage || null,
      last_episode_watched: episodeNum,
      progress_seconds: floorPos,
      total_seconds: floorDur > 0 ? floorDur : null,
      completed: isCompleted,
      completed_at: isCompleted ? nowIso : null,
      updated_at: nowIso,
    };

    let localSaved = false;
    try {
      const { error: localErr } = await supabase
        .from('watch_history')
        .upsert(localPayload, { onConflict: 'user_id,anime_slug' });

      if (localErr) {
        console.error('[ProgressSyncEngine] Failed to save local watch_history:', localErr);
      } else {
        localSaved = true;
      }
    } catch (e) {
      console.error('[ProgressSyncEngine] Exception saving local watch_history:', e);
    }

    // If episode is NOT completed, do not send premature episode increments to AniList/MAL
    if (!isCompleted) {
      return {
        success: localSaved,
        localSaved,
        completed: false,
        episodeNumber: episodeNum,
        providers: {},
        source: 'ANIWAVEX',
        timestamp: nowIso,
      };
    }

    // ── 2. Check Connected Accounts ──
    const { data: accounts } = await supabase
      .from('external_accounts')
      .select('id, provider, status')
      .eq('user_id', userId);

    const anilistAccount = accounts?.find((a) => a.provider === 'ANILIST');
    const malAccount = accounts?.find((a) => a.provider === 'MYANIMELIST');

    const isAniListConnected = anilistAccount?.status === 'CONNECTED';
    const isMALConnected = malAccount?.status === 'CONNECTED';

    if (!isAniListConnected && !isMALConnected) {
      return {
        success: localSaved,
        localSaved,
        completed: true,
        episodeNumber: episodeNum,
        providers: {
          anilist: anilistAccount ? { status: 'REAUTH_REQUIRED', message: 'AniList reconnect needed' } : { status: 'NOT_CONNECTED' },
          mal: malAccount ? { status: 'REAUTH_REQUIRED', message: 'MyAnimeList reconnect needed' } : { status: 'NOT_CONNECTED' },
        },
        source: 'ANIWAVEX',
        timestamp: nowIso,
      };
    }

    // ── 3. Resolve Anime Mapping ──
    const mapping = await resolveAnimeMapping(
      supabase,
      session.animeSlug,
      session.kitsuId,
      session.animeTitle
    );

    const providerResults: {
      anilist?: ProviderSyncStatus;
      mal?: ProviderSyncStatus;
    } = {};

    // ── 4. AniList Sync ──
    if (isAniListConnected) {
      if (mapping?.anilist_id) {
        // Enqueue sync job
        const { data: job } = await supabase
          .from('sync_jobs')
          .insert({
            user_id: userId,
            anime_slug: session.animeSlug,
            anime_title: session.animeTitle,
            episode_number: episodeNum,
            total_episodes: mapping.total_episodes,
            provider: 'ANILIST',
            operation: 'UPDATE_PROGRESS',
            status: 'PROCESSING',
            attempts: 1,
            source: 'ANIWAVEX',
          })
          .select('id')
          .single();

        const alResult = await AniListSyncProvider.updateProgress({
          supabase,
          userId,
          anilistMediaId: mapping.anilist_id,
          episodeNumber: episodeNum,
          totalEpisodes: mapping.total_episodes,
          animeTitle: session.animeTitle,
        });

        providerResults.anilist = alResult;

        // Update job status
        if (job?.id) {
          await supabase
            .from('sync_jobs')
            .update({
              status: alResult.status === 'SUCCESS' ? 'SUCCESS' : alResult.status === 'REAUTH_REQUIRED' ? 'REAUTH_REQUIRED' : 'FAILED',
              error: alResult.status !== 'SUCCESS' ? alResult.message : null,
              completed_at: alResult.status === 'SUCCESS' ? nowIso : null,
            })
            .eq('id', job.id);
        }
      } else {
        providerResults.anilist = {
          status: 'FAILED',
          message: 'Unable to sync with AniList because the provider mapping is unavailable.',
        };
      }
    } else if (anilistAccount) {
      providerResults.anilist = {
        status: anilistAccount.status as any,
        message: 'AniList requires reconnection',
      };
    }

    // ── 5. MyAnimeList Sync ──
    if (isMALConnected) {
      if (mapping?.mal_id) {
        // Enqueue sync job
        const { data: job } = await supabase
          .from('sync_jobs')
          .insert({
            user_id: userId,
            anime_slug: session.animeSlug,
            anime_title: session.animeTitle,
            episode_number: episodeNum,
            total_episodes: mapping.total_episodes,
            provider: 'MYANIMELIST',
            operation: 'UPDATE_PROGRESS',
            status: 'PROCESSING',
            attempts: 1,
            source: 'ANIWAVEX',
          })
          .select('id')
          .single();

        const malResult = await MALSyncProvider.updateProgress({
          supabase,
          userId,
          malAnimeId: mapping.mal_id,
          episodeNumber: episodeNum,
          totalEpisodes: mapping.total_episodes,
          animeTitle: session.animeTitle,
        });

        providerResults.mal = malResult;

        // Update job status
        if (job?.id) {
          await supabase
            .from('sync_jobs')
            .update({
              status: malResult.status === 'SUCCESS' ? 'SUCCESS' : malResult.status === 'REAUTH_REQUIRED' ? 'REAUTH_REQUIRED' : 'FAILED',
              error: malResult.status !== 'SUCCESS' ? malResult.message : null,
              completed_at: malResult.status === 'SUCCESS' ? nowIso : null,
            })
            .eq('id', job.id);
        }
      } else {
        providerResults.mal = {
          status: 'FAILED',
          message: 'Unable to sync with MyAnimeList because the provider mapping is unavailable.',
        };
      }
    } else if (malAccount) {
      providerResults.mal = {
        status: malAccount.status as any,
        message: 'MyAnimeList requires reconnection',
      };
    }

    // ── 6. Log to Sync History ──
    const anySuccess =
      providerResults.anilist?.status === 'SUCCESS' ||
      providerResults.mal?.status === 'SUCCESS';

    const providersSummary = [
      providerResults.anilist?.status === 'SUCCESS' ? 'AniList' : null,
      providerResults.mal?.status === 'SUCCESS' ? 'MyAnimeList' : null,
    ].filter(Boolean).join(' & ');

    if (anySuccess) {
      await supabase.from('sync_history').insert({
        user_id: userId,
        provider: providersSummary || 'ALL',
        status: 'SUCCESS',
        items_synced: 1,
        progress_updates: 1,
        summary: `Auto-synced "${session.animeTitle || session.animeSlug}" Ep ${episodeNum} to ${providersSummary}`,
        details: {
          anime_slug: session.animeSlug,
          episode_number: episodeNum,
          providers: providerResults,
          source: 'ANIWAVEX',
        },
      });
    }

    return {
      success: localSaved,
      localSaved,
      completed: true,
      episodeNumber: episodeNum,
      providers: providerResults,
      source: 'ANIWAVEX',
      timestamp: nowIso,
    };
  }

  /**
   * Retry a failed sync job with exponential backoff strategy.
   */
  static async retryJob(supabase: SupabaseClient, userId: string, jobId: string) {
    const { data: job } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) {
      throw new Error('Sync job not found');
    }

    if (job.attempts >= job.max_attempts) {
      throw new Error(`Job exceeded maximum retry attempts (${job.max_attempts})`);
    }

    // Resolve mapping
    const mapping = await resolveAnimeMapping(supabase, job.anime_slug);
    if (!mapping) {
      throw new Error('Provider mapping is unavailable for this anime');
    }

    let result: ProviderSyncStatus;
    if (job.provider === 'ANILIST') {
      if (!mapping.anilist_id) throw new Error('AniList media ID not found');
      result = await AniListSyncProvider.updateProgress({
        supabase,
        userId,
        anilistMediaId: mapping.anilist_id,
        episodeNumber: job.episode_number,
        totalEpisodes: job.total_episodes,
        animeTitle: job.anime_title,
      });
    } else {
      if (!mapping.mal_id) throw new Error('MAL anime ID not found');
      result = await MALSyncProvider.updateProgress({
        supabase,
        userId,
        malAnimeId: mapping.mal_id,
        episodeNumber: job.episode_number,
        totalEpisodes: job.total_episodes,
        animeTitle: job.anime_title,
      });
    }

    const nextAttempts = job.attempts + 1;
    // Exponential backoff: 30s, 2m, 8m, 32m
    const backoffSeconds = Math.pow(4, nextAttempts) * 10;
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    await supabase
      .from('sync_jobs')
      .update({
        attempts: nextAttempts,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'REAUTH_REQUIRED' ? 'REAUTH_REQUIRED' : nextAttempts >= job.max_attempts ? 'FAILED' : 'RETRYING',
        error: result.status !== 'SUCCESS' ? result.message : null,
        next_retry_at: nextRetryAt,
        completed_at: result.status === 'SUCCESS' ? new Date().toISOString() : null,
      })
      .eq('id', job.id);

    return result;
  }
}
