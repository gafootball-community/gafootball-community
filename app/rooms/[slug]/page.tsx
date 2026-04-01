'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import RoomVisitorTracker from '@/components/RoomVisitorTracker';
import { MessageInput } from '@/components/message-input';
import { ReportButton } from '@/components/report-button';
import { supabase } from '@/lib/supabase';
import type { Message, Room } from '@/lib/types';

function formatTime(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function RoomDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          router.replace('/');
          return;
        }

        setMyId(user.id);

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
          .select('*, profiles:profile_id (id, nickname, avatar_url)')
          .eq('room_id', roomData.id)
          .order('created_at', { ascending: true })
          .limit(200);

        if (messageError) throw messageError;
        setMessages((messageData ?? []) as Message[]);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : 'ルーム読み込みに失敗しました。'
        );
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [slug, router]);

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
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles:profile_id (id, nickname, avatar_url)')
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
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [messages]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.is_hidden && !m.is_deleted),
    [messages]
  );

  return (
    <main className="pb-[calc(10rem+env(safe-area-inset-bottom))]">
      {room && myId && (
        <RoomVisitorTracker profileId={myId} roomSlug={room.slug} />
      )}

      <header className="sticky top-0 z-10 mb-4 border-b border-white/10 bg-bg/95 py-3 backdrop-blur">
        <Link href="/" className="text-xs text-accent">
          ← ルーム一覧へ
        </Link>
        <h1 className="mt-1 text-xl font-bold">{room?.name ?? 'ルーム'}</h1>
      </header>

      {loading ? (
        <p className="text-sm text-textSub">読み込み中...</p>
      ) : (
        <section className="space-y-4 pb-4">
          {visibleMessages.map((msg) => {
            const mine = myId === msg.profile_id;

            if (mine) {
              return (
                <article key={msg.id} className="flex justify-end">
                  <div className="max-w-[78%]">
                    <div className="rounded-2xl rounded-br-md bg-bubbleSelf px-3 py-2 text-sm text-white">
                      {msg.content}
                    </div>
                    <div className="mt-1 text-right text-[11px] text-textSub">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </article>
              );
            }

            return (
              <article key={msg.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/profile/${msg.profile_id}`)}
                  className="mt-1 shrink-0"
                >
                  {msg.profiles?.avatar_url ? (
                    <img
                      src={msg.profiles.avatar_url}
                      alt={msg.profiles.nickname ?? 'avatar'}
                      className="h-9 w-9 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-xs">
                      👤
                    </div>
                  )}
                </button>

                <div className="max-w-[78%]">
                  <button
                    type="button"
                    onClick={() => router.push(`/profile/${msg.profile_id}`)}
                    className="mb-1 block text-left text-xs text-textSub"
                  >
                    {msg.profiles?.nickname ?? '匿名ユーザー'}
                  </button>

                  <div className="inline-block rounded-2xl rounded-bl-md bg-bubbleOther px-3 py-2 text-sm text-white">
                    {msg.content}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-textSub">
                    <span>{formatTime(msg.created_at)}</span>
                    <ReportButton
                      messageId={msg.id}
                      reportedProfileId={msg.profile_id}
                    />
                  </div>
                </div>
              </article>
            );
          })}

          <div ref={endRef} className="scroll-mb-28" />
        </section>
      )}

      {room && <MessageInput roomId={room.id} />}
    </main>
  );
}