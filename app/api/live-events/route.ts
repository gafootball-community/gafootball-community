import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomSlug = searchParams.get('roomSlug');

    if (!roomSlug) {
      return NextResponse.json(
        { ok: false, error: 'roomSlug is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('room_slug', roomSlug)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      events: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}