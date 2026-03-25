'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { MessageInput } from '@/components/message-input';
import { ReportButton } from '@/components/report-button';
import { ensureAnonymousUser, getCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Message, Room } from '@/lib/types';

type Props = {
  params: { slug: string };
};

export default function RoomPage({ params }: Props) {
  const slug = useMemo(() => params.slug, [params.slug]);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profileId, setProfileId] = useState<string>('');

  useEffect(() => {
    (async () => {
      await ensureAnonymousUser();
      const userId = await getCurrentUserId();
      if (userId) setProfileId(userId);
      await loadRoomAndMessages();
    })();
  }, [slug]);

  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        () => {
          loadMessages(room.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id]);

  async function loadRoomAndMessages() {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('slug', slug).single();
    if (!roomData) return;
    setRoom(roomData);
    await loadMessages(roomData.id);
  }

  async function loadMessages(roomId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, room_id, profile_id, content, is_hidden, is_deleted, created_at, profile:profiles(nickname)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200);

    setMessages((data as Message[]) ?? []);
  }

  return (
    <main className="min-h-screen px-4 pb-40 pt-4">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-zinc-400">← 戻る</Link>
        <h1 className="text-lg font-semibold">{room?.name ?? 'ルーム'}</h1>
      </header>

      <section className="space-y-3 pb-8">
        {messages.map((msg) => (
          <article key={msg.id} className="rounded-md border border-zinc-800 bg-card px-3 py-2">
            {msg.is_hidden || msg.is_deleted ? (
              <p className="text-sm text-zinc-500">このメッセージは非表示です。</p>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-accent">{msg.profile?.nickname ?? 'ゲスト'}</span>
                  <ReportButton messageId={msg.id} reporterId={profileId} />
                </div>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </>
            )}
          </article>
        ))}
      </section>

      {room && profileId && <MessageInput roomId={room.id} profileId={profileId} onSent={() => loadMessages(room.id)} />}
      <BottomNav />
    </main>
  );
}
