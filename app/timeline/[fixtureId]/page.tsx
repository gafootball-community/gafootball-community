'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth';

type Fixture = {
  id: string;
  league_key: string;
  league_name: string;
  home_team: string;
  away_team: string;
  home_team_short: string | null;
  away_team_short: string | null;
  kickoff_at: string;
  expires_at: string | null;
  status: 'upcoming' | 'live' | 'finished';
  home_score: number;
  away_score: number;
};

type TimelinePost = {
  id: string;
  fixture_id: string;
  profile_id: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  expires_at: string;
  is_hidden: boolean;
  is_deleted: boolean;
  profiles?: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
};

function formatKickoff(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatPostTime(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function statusLabel(status: Fixture['status']) {
  if (status === 'live') return 'LIVE';
  if (status === 'finished') return '試合終了';
  return '試合前';
}

function statusClass(status: Fixture['status']) {
  if (status === 'live') {
    return 'border border-red-400/20 bg-red-500/15 text-red-300';
  }

  if (status === 'finished') {
    return 'border border-white/10 bg-white/10 text-textSub';
  }

  return 'border border-accent/20 bg-accent/15 text-accent';
}

function TeamName({
  name,
  align = 'left',
}: {
  name: string;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={`min-w-0 overflow-x-auto scrollbar-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div
        className={`inline-block min-w-full whitespace-nowrap text-sm font-semibold text-white ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
        title={name}
      >
        {name}
      </div>
    </div>
  );
}

function getTimelineRemainingText(targetDate: string | null) {
  if (!targetDate) return 'まもなく削除';

  const diff = new Date(targetDate).getTime() - Date.now();

  if (diff <= 0) return 'まもなく削除';

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `あと${minutes}分で削除`;
  return `あと${hours}時間${minutes}分で削除`;
}

export default function TimelineDetailPage() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const router = useRouter();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const fetchTimeline = async () => {
    const { data: fixtureData, error: fixtureError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('id', fixtureId)
      .single();

    if (fixtureError) throw fixtureError;

    const nextFixture = fixtureData as Fixture;

    if (
      nextFixture.expires_at &&
      new Date(nextFixture.expires_at).getTime() <= Date.now()
    ) {
      router.replace('/timeline');
      return;
    }

    const { data: postData, error: postError } = await supabase
      .from('timeline_posts')
      .select('*, profiles:profile_id (id, nickname, avatar_url)')
      .eq('fixture_id', fixtureId)
      .order('created_at', { ascending: false });

    if (postError) throw postError;

    setFixture(nextFixture);
    setPosts((postData ?? []) as TimelinePost[]);
  };

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
        await fetchTimeline();
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : 'タイムラインの読み込みに失敗しました。'
        );
        router.replace('/timeline');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [fixtureId, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`timeline-${fixtureId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_posts',
          filter: `fixture_id=eq.${fixtureId}`,
        },
        async () => {
          const { data } = await supabase
            .from('timeline_posts')
            .select('*, profiles:profile_id (id, nickname, avatar_url)')
            .eq('fixture_id', fixtureId)
            .order('created_at', { ascending: false });

          setPosts((data ?? []) as TimelinePost[]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fixtureId]);

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          !post.is_hidden &&
          !post.is_deleted &&
          (!fixture?.expires_at ||
            new Date(fixture.expires_at).getTime() > Date.now())
      ),
    [posts, fixture]
  );

  const sendPost = async (e: FormEvent) => {
    e.preventDefault();

    const content = value.trim();
    if (!content || sending) return;

    setSending(true);

    try {
      const profileId = await currentUserId();

      if (!profileId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const expiresAt = fixture?.expires_at
        ? fixture.expires_at
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('timeline_posts').insert({
        fixture_id: fixtureId,
        profile_id: profileId,
        content,
        expires_at: expiresAt,
      });

      if (error) throw error;

      setValue('');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿に失敗しました。'
      );
    } finally {
      setSending(false);
    }
  };

  const deletePost = async (postId: string) => {
    const confirmed = window.confirm('この投稿を削除しますか？');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('timeline_posts')
        .update({ is_deleted: true })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, is_deleted: true } : post
        )
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿の削除に失敗しました。'
      );
    }
  };

  const reportPost = async (postId: string) => {
    const confirmed = window.confirm('この投稿を通報しますか？');
    if (!confirmed) return;

    setReportingId(postId);

    try {
      const reporterId = await currentUserId();

      if (!reporterId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const { error } = await supabase.from('timeline_post_reports').insert({
        post_id: postId,
        reporter_profile_id: reporterId,
      });

      if (error) throw error;

      window.alert('通報を受け付けました。');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '通報に失敗しました。'
      );
    } finally {
      setReportingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),rgba(4,8,7,0.98)_38%,rgba(1,3,2,1)_100%)] pb-36 text-textMain">
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Link href="/timeline" className="text-xs text-accent">
          ← タイムライン一覧へ
        </Link>

        {loading ? (
          <p className="mt-6 text-sm text-textSub">読み込み中...</p>
        ) : fixture ? (
          <>
            <section className="sticky top-0 z-20 mt-4 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(10,18,14,0.96),rgba(4,10,8,0.98))] p-4 shadow-[0_0_30px_rgba(16,185,129,0.08)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="truncate text-xs font-medium text-textSub">
                  {fixture.league_name}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass(
                    fixture.status
                  )}`}
                >
                  {statusLabel(fixture.status)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0">
                  <TeamName name={fixture.home_team} />
                </div>

                <div className="shrink-0 text-center">
                  <div className="min-w-[82px] rounded-2xl border border-accent/20 bg-accent/10 px-4 py-2">
                    <p className="text-xl font-bold tracking-wide text-white">
                      {fixture.home_score} - {fixture.away_score}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <TeamName name={fixture.away_team} align="right" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <p className="text-textSub">
                  キックオフ: {formatKickoff(fixture.kickoff_at)}
                </p>
                <p className="font-medium text-accent">
                  このタイムラインは24時間後に削除されます
                </p>
              </div>

              <div className="mt-2 text-right text-[11px] text-textSub">
                {getTimelineRemainingText(fixture.expires_at)}
              </div>
            </section>

            <section className="mt-5 space-y-4">
              {visiblePosts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-panel/80 p-5 text-sm text-textSub">
                  まだ投稿はありません。最初の投稿をしてみよう。
                </div>
              ) : (
                visiblePosts.map((post) => {
                  const mine = myId === post.profile_id;

                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,16,0.95),rgba(8,12,10,0.98))] p-4 shadow-[0_0_20px_rgba(16,185,129,0.04)]"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/profile/${post.profile_id}`)
                          }
                          className="shrink-0"
                        >
                          {post.profiles?.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt={post.profiles.nickname ?? 'avatar'}
                              className="h-10 w-10 rounded-full border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-xs">
                              👤
                            </div>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/profile/${post.profile_id}`)
                              }
                              className="truncate text-left text-sm font-semibold text-white"
                            >
                              {post.profiles?.nickname ?? '匿名ユーザー'}
                            </button>

                            <div className="flex items-center gap-2 text-[11px] text-textSub">
                              <span>{formatPostTime(post.created_at)}</span>
                            </div>
                          </div>

                          {post.content && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-textMain">
                              {post.content}
                            </p>
                          )}

                          {post.image_url && (
                            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                              <img
                                src={post.image_url}
                                alt="timeline post"
                                className="max-h-[360px] w-full object-cover"
                              />
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-4 text-xs text-textSub">
                            <button
                              type="button"
                              className="transition hover:text-textMain"
                            >
                              ⚽ いいね
                            </button>

                            <button
                              type="button"
                              className="transition hover:text-textMain"
                            >
                              返信
                            </button>

                            {!mine && (
                              <button
                                type="button"
                                onClick={() => void reportPost(post.id)}
                                disabled={reportingId === post.id}
                                className="text-[11px] text-yellow-300 transition hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {reportingId === post.id ? '通報中...' : '通報'}
                              </button>
                            )}

                            {mine && (
                              <>
                                <span className="text-[11px] text-accent">
                                  あなたの投稿
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void deletePost(post.id)}
                                  className="text-[11px] text-red-300 transition hover:text-red-200"
                                >
                                  削除
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            <form
              onSubmit={sendPost}
              className="fixed inset-x-0 bottom-[calc(4.13rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-[rgba(5,10,8,0.94)] px-3 py-2 backdrop-blur"
            >
              <div className="mx-auto flex max-w-2xl items-center gap-2 px-2">
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-lg text-white transition hover:border-accent/30"
                >
                  ＋
                </button>

                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="この試合について投稿する"
                  className="h-10 flex-1 rounded-full border border-white/10 bg-panelSoft px-4 text-base text-textMain placeholder:text-textSub focus:border-accent focus:outline-none"
                  maxLength={280}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />

                <button
                  type="submit"
                  disabled={sending || value.trim().length === 0}
                  className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? '送信中' : '投稿'}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </main>
  );
}