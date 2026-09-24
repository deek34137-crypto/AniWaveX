import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProgressSyncEngine } from '@/lib/sync/progress-sync-engine';
import { PlaybackSession } from '@/types/sync';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PlaybackSession = await req.json();

    if (!body.animeSlug || !body.episodeNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: animeSlug, episodeNumber' },
        { status: 400 }
      );
    }

    const result = await ProgressSyncEngine.processPlaybackSession(
      supabase,
      user.id,
      body
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /account/sync/playback] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
