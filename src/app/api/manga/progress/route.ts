import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface MangaSyncPayload {
  mangaId: string;
  mangaTitle: string;
  posterImage?: string;
  chapterId: string;
  chapterNumber: number;
  pageNumber: number;
  totalPages?: number;
  readingMode?: 'webtoon' | 'paged-rtl' | 'paged-ltr';
  completed?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mangaId = searchParams.get('mangaId');

    if (mangaId) {
      const { data, error } = await supabase
        .from('manga_reading_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ progress: data });
    }

    // Return list of recently read manga
    const { data, error } = await supabase
      .from('manga_reading_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recentManga: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MangaSyncPayload = await req.json();

    if (!body.mangaId || !body.chapterId) {
      return NextResponse.json(
        { error: 'Missing required fields: mangaId, chapterId' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const pageNum = Math.max(1, body.pageNumber || 1);
    const totalPages = body.totalPages && body.totalPages > 0 ? body.totalPages : null;
    const isCompleted = body.completed || (totalPages ? pageNum >= totalPages : false);

    const payload = {
      user_id: user.id,
      manga_id: body.mangaId,
      manga_title: body.mangaTitle || 'Manga',
      poster_image: body.posterImage || null,
      chapter_id: body.chapterId,
      chapter_number: body.chapterNumber || 1,
      page_number: pageNum,
      total_pages: totalPages,
      reading_mode: body.readingMode || 'webtoon',
      completed: isCompleted,
      completed_at: isCompleted ? nowIso : null,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('manga_reading_history')
      .upsert(payload, { onConflict: 'user_id,manga_id' })
      .select()
      .single();

    if (error) {
      console.error('[API /manga/progress] Error upserting progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also sync progress into manga_bookmarks if user has bookmarked this manga
    try {
      await supabase
        .from('manga_bookmarks')
        .update({
          last_chapter_read: String(body.chapterNumber || 1),
          last_chapter_id: body.chapterId,
          last_page_read: pageNum,
          updated_at: nowIso,
        })
        .eq('user_id', user.id)
        .eq('manga_id', body.mangaId);
    } catch {}

    return NextResponse.json({ success: true, progress: data });
  } catch (err: any) {
    console.error('[API /manga/progress] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mangaId = searchParams.get('mangaId');

    if (!mangaId) {
      return NextResponse.json({ error: 'Missing mangaId parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('manga_reading_history')
      .delete()
      .eq('user_id', user.id)
      .eq('manga_id', mangaId);

    if (error) {
      console.error('[API /manga/progress DELETE] Error deleting history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /manga/progress DELETE] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
