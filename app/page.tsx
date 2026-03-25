'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/bottom-nav';
import { ensureAnonymousUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    ensureAnonymousUser().then(loadRooms);
  }, []);

  async function loadRooms() {
    const { data } = await supabase.from('rooms').select('*').order('sort_order', { ascending: true });
    setRooms(data ?? []);
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-1 text-2xl font-bold">GA Football Community</h1>
      <p className="mb-6 text-sm text-zinc-400">好きなルームに参加してリアルタイムで会話しよう。</p>

      <section className="space-y-2">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.slug}`}
            className="block rounded-lg border border-zinc-800 bg-card px-4 py-3 text-sm hover:border-accentDim"
          >
            {room.name}
          </Link>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
