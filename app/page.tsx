'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ROOM_ORDER } from '@/lib/constants';
import { fetchRoomOnlineCounts } from '@/lib/roomVisitors';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

const ROOM_ICONS: Record<string, string> = {
  'premier-league': '/room-icons/premier-league.png',
  'la-liga': '/room-icons/la-liga.png',
  bundesliga: '/room-icons/bundesliga.png',
  'serie-a': '/room-icons/serie-a.png',
  'ligue-1': '/room-icons/ligue-1.png',
  'champions-league': '/room-icons/champions-league.png',
  'national-team': '/room-icons/national.png',
  'transfer-news': '/room-icons/transfer.png',
  chat: '/room-icons/chat.png',
};

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem('termsAccepted');
    if (ok === 'true') setAccepted(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setIsAuthenticated(false);
          setRooms([]);
          setCounts({});
          setError(null);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        setRooms((data ?? []) as Room[]);

        const onlineCounts = await fetchRoomOnlineCounts();
        setCounts(onlineCounts);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'ルーム一覧の取得に失敗しました。';

        if (message === 'Auth session missing') {
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      if (!user) {
        setIsAuthenticated(false);
        setRooms([]);
        setCounts({});
        setError(null);
        setLoggingIn(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setAccepted(true);
      localStorage.setItem('termsAccepted', 'true');

      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        setRooms((data ?? []) as Room[]);

        const onlineCounts = await fetchRoomOnlineCounts();
        setCounts(onlineCounts);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'ルーム一覧の取得に失敗しました。';

        if (message === 'Auth session missing') {
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        setLoggingIn(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const loadCounts = async () => {
      try {
        const onlineCounts = await fetchRoomOnlineCounts();
        if (mounted) {
          setCounts(onlineCounts);
        }
      } catch (e) {
        console.error('人数取得に失敗しました', e);
      }
    };

    void loadCounts();

    const channel = supabase
      .channel('room-visitors-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_visitors',
        },
        async () => {
          await loadCounts();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleGoogleLogin = async () => {
    try {
      setLoggingIn(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Googleログインに失敗しました。'
      );
      setLoggingIn(false);
    }
  };

  const sorted = useMemo(() => {
    return [...rooms].sort(
      (a, b) =>
        ROOM_ORDER.indexOf(a.slug as (typeof ROOM_ORDER)[number]) -
        ROOM_ORDER.indexOf(b.slug as (typeof ROOM_ORDER)[number])
    );
  }, [rooms]);

  const maxCount = Math.max(...Object.values(counts), 0);

  return (
    <>
      {!loading && (!accepted || !isAuthenticated) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="max-w-md rounded-2xl border border-white/10 bg-panel p-6 text-sm shadow-xl">
            <h2 className="mb-2 text-lg font-bold">利用規約</h2>

            <p className="mb-4 text-xs leading-relaxed text-textSub">
              本サービスは匿名チャットサービスです。
              <br />
              誹謗中傷・スパム・違法コンテンツの投稿は禁止します。
              <br />
              違反した場合、投稿削除や利用制限を行う場合があります。
            </p>

            <Link
              href="/terms"
              className="mb-3 block text-center text-xs text-accent underline"
            >
              利用規約を全文見る
            </Link>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loggingIn}
              className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingIn
                ? 'Googleログイン中...'
                : '規約に同意してGoogleでログイン'}
            </button>
          </div>
        </div>
      )}

      <main>
        <header className="mb-6 mt-2">
          <p className="text-xs uppercase tracking-widest text-accent">
            G+A FOOTBALL COMMUNITY CHAT
          </p>

          <h1 className="mt-2 text-2xl font-bold">固定ルーム</h1>

          <p className="mt-2 text-sm text-textSub">
            参加したいルームを選んで、リアルタイムで会話しましょう。
          </p>
        </header>

        {loading && <p className="text-sm text-textSub">読み込み中...</p>}

        {isAuthenticated && error && (
          <p className="rounded-xl bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="space-y-3">
          {sorted.map((room) => {
            const onlineCount = counts[room.slug] ?? 0;
            const isFeatured = onlineCount > 0 && onlineCount === maxCount;

            return (
              <Link
                key={room.id}
                href={isAuthenticated ? `/rooms/${room.slug}` : '#'}
                onClick={(e) => {
                  if (!isAuthenticated) e.preventDefault();
                }}
                className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition duration-300 hover:scale-[1.02] hover:border-accent/40 hover:bg-white/10"
              >
                <div className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">
                  👤 {onlineCount}
                </div>

                {isFeatured && (
                  <div className="absolute left-3 top-3 rounded-full bg-amber-300/90 px-3 py-1 text-xs font-semibold text-black">
                    🏆 注目
                  </div>
                )}

                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/10 bg-accentSoft">
                  <Image
                    src={ROOM_ICONS[room.slug] ?? '/room-icons/chat.png'}
                    alt={room.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 scale-110 rounded-full object-cover object-center"
                  />
                </div>

                <div className={isFeatured ? 'pt-7' : ''}>
                  <p className="text-base font-semibold">{room.name}</p>
                  <p className="mt-1 text-xs text-textSub">
                    {onlineCount}人が参加中
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </>
  );
}