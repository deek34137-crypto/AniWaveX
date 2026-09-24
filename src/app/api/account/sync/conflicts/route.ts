import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conflicts, error } = await supabase
      .from('sync_conflicts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'UNRESOLVED')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conflicts: conflicts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conflictId, resolutionPolicy } = await req.json();
    if (!conflictId || !resolutionPolicy) {
      return NextResponse.json(
        { error: 'conflictId and resolutionPolicy are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('sync_conflicts')
      .update({
        status: 'RESOLVED',
        resolution_policy: resolutionPolicy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', conflictId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
