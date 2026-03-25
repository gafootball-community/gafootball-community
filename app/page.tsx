'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ensureAnonymousProfile } from '@/lib/auth';
import { ROOM_ORDER } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

const ROOM_ICONS: Record<string, string> = {
  'today-match': '⚽',
  'national-team': '🌍',
  'transfer-news': '🔄',
  'premier-league': '🏴',
  'la-liga': '🇪🇸',
  bundesliga: '🇩🇪',
  'serie-a': '🇮🇹',
  'ligue-1': '🇫🇷',
  chat: '💬'
};

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await ensureAnonymousProfile();

        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setRooms((data ?? []) as Room[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ルーム一覧の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const sorted = useMemo(() => {
    return [...rooms].sort(
      (a, b) => ROOM_ORDER.indexOf(a.slug as (typeof ROOM_ORDER)[number]) - ROOM_ORDER.indexOf(b.slug as (typeof ROOM_ORDER)[number])
    );
  }, [rooms]);

  return (
    <main>
      <header className="mb-6 mt-2">
        <p className="text-xs uppercase tracking-widest text-accent">Football Group Chat</p>
        <h1 className="mt-2 text-2xl font-bold">固定ルーム</h1>
        <p className="mt-2 text-sm text-textSub">参加したいルームを選んで、リアルタイムで会話しましょう。</p>
      </header>

      {loading && <p className="text-sm text-textSub">読み込み中...</p>}
      {error && <p className="rounded-xl bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

      <section className="space-y-3">
        {sorted.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.slug}`}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-panel p-4 shadow-card transition hover:border-accent/40"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accentSoft text-xl">
              <span aria-hidden>{ROOM_ICONS[room.slug] ?? '⚽'}</span>
            </div>
            <div>
              <p className="text-base font-semibold">{room.name}</p>
              <p className="mt-1 text-xs text-textSub">ルームに参加して会話する</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
