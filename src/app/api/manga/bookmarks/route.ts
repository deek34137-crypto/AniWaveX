import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        .from('manga_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ bookmark: data });
    }

    const { data, error } = await supabase
      .from('manga_bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: data || [] });
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

    const body = await req.json();

    if (!body.manga_id && !body.mangaId) {
      return NextResponse.json({ error: 'Missing mangaId' }, { status: 400 });
    }

    const mangaId = String(body.manga_id || body.mangaId);
    const mangaTitle = body.manga_title || body.mangaTitle || 'Manga';
    const posterImage = body.poster_image || body.posterImage || null;
    const status = body.status || 'reading';
    const lastChapterRead = body.last_chapter_read || body.lastChapterRead || null;
    const lastChapterId = body.last_chapter_id || body.lastChapterId || null;
    const lastPageRead = body.last_page_read || body.lastPageRead || 1;
    const nowIso = new Date().toISOString();

    const payload = {
      user_id: user.id,
      manga_id: mangaId,
      manga_title: mangaTitle,
      poster_image: posterImage,
      status: status,
      last_chapter_read: lastChapterRead ? String(lastChapterRead) : null,
      last_chapter_id: lastChapterId ? String(lastChapterId) : null,
      last_page_read: Number(lastPageRead) || 1,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('manga_bookmarks')
      .upsert(payload, { onConflict: 'user_id,manga_id' })
      .select()
      .single();

    if (error) {
      console.error('[API /manga/bookmarks] Error upserting bookmark:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookmark: data });
  } catch (err: any) {
    console.error('[API /manga/bookmarks] Unexpected error:', err);
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
      .from('manga_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('manga_id', mangaId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
