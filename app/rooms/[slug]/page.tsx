'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureAnonymousProfile } from '@/lib/auth';
import { MessageInput } from '@/components/message-input';
import { ReportButton } from '@/components/report-button';
import { supabase } from '@/lib/supabase';
import type { Message, Room } from '@/lib/types';

function formatTime(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export default function RoomDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await ensureAnonymousProfile();
        setMyId(profile.id);

        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData as Room);

        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*, profiles:profile_id (id, nickname)')
          .eq('room_id', roomData.id)
          .order('created_at', { ascending: true })
          .limit(200);

        if (messageError) throw messageError;
        setMessages((messageData ?? []) as Message[]);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'ルーム読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [slug]);

  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`
        },
        async () => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles:profile_id (id, nickname)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true })
            .limit(200);
          setMessages((data ?? []) as Message[]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.is_hidden && !m.is_deleted),
    [messages]
  );

  return (
    <main className="pb-[calc(11rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 mb-3 border-b border-white/10 bg-bg/95 py-3 backdrop-blur">
        <Link href="/" className="text-xs text-accent">
          ← ルーム一覧へ
        </Link>
        <h1 className="mt-1 text-xl font-bold">{room?.name ?? 'ルーム'}</h1>
      </header>

      {loading ? (
        <p className="text-sm text-textSub">読み込み中...</p>
      ) : (
        <section className="space-y-3 pb-6">
          {visibleMessages.map((msg) => {
            const mine = myId === msg.profile_id;
            return (
              <article key={msg.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[82%]">
                  {!mine && (
                    <div className="mb-1 px-1 text-xs text-textSub">{msg.profiles?.nickname ?? '匿名ユーザー'}</div>
                  )}
                  <div
                    className={mine
                      ? 'rounded-2xl rounded-br-md bg-bubbleSelf px-3 py-2 text-sm text-black'
                      : 'rounded-2xl rounded-bl-md bg-bubbleOther px-3 py-2 text-sm text-textMain'}
                  >
                    {msg.content}
                  </div>
                  <div className={mine ? 'mt-1 text-right text-[11px] text-textSub' : 'mt-1 text-[11px] text-textSub'}>
                    {formatTime(msg.created_at)}
                    {!mine && <ReportButton messageId={msg.id} />}
                  </div>
                </div>
              </article>
            );
          })}
          <div ref={endRef} />
        </section>
      )}

      {room && <MessageInput roomId={room.id} />}
    </main>
  );
}
