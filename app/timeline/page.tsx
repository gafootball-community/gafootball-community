'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

function formatKickoff(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function statusLabel(status: Fixture['status']) {
  if (status === 'live') return 'LIVE';
  if (status === 'finished') return '終了';
  return 'まもなく開始';
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
      className={`min-w-0 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div className="overflow-x-auto whitespace-nowrap scrollbar-none">
        <p className="inline-block text-xs font-semibold text-white">
          {name}
        </p>
      </div>
    </div>
  );
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <Link
      href={`/timeline/${fixture.id}`}
      className="block rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(10,18,14,0.96),rgba(5,10,8,0.98))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-accent/30"
    >
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* 左チーム */}
        <div className="flex min-w-0 items-center">
          <TeamName name={fixture.home_team} />
        </div>

        {/* スコア */}
        <div className="shrink-0 text-center">
          <div className="min-w-[64px] rounded-xl border border-accent/15 bg-accent/10 px-2 py-1.5">
            <p className="text-sm font-bold tracking-wide text-white">
              {fixture.home_score} - {fixture.away_score}
            </p>
          </div>
        </div>

        {/* 右チーム */}
        <div className="flex min-w-0 items-center justify-end">
          <TeamName name={fixture.away_team} align="right" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-textSub">
          {formatKickoff(fixture.kickoff_at)}
        </p>

        <p className="shrink-0 text-[11px] font-medium text-accent">
          タイムライン →
        </p>
      </div>
    </Link>
  );
}

export default function TimelinePage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const { data, error } = await supabase
          .from('fixtures')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .order('kickoff_at', { ascending: true });

        if (error) throw error;

        setFixtures((data ?? []) as Fixture[]);
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : 'タイムラインの取得に失敗しました。'
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchFixtures();
  }, []);

  const liveFixtures = useMemo(
    () => fixtures.filter((f) => f.status === 'live'),
    [fixtures]
  );

  const upcomingFixtures = useMemo(
    () => fixtures.filter((f) => f.status === 'upcoming'),
    [fixtures]
  );

  const finishedFixtures = useMemo(
    () => fixtures.filter((f) => f.status === 'finished'),
    [fixtures]
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 text-textMain">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">タイムライン</h1>
        <p className="mt-2 text-xs text-textSub">
          試合ごとのタイムラインに参加して、リアルタイムで投稿しよう。
        </p>
      </header>

      {loading ? (
        <p className="text-xs text-textSub">読み込み中...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span>🔥</span>
              <h2 className="text-sm font-bold text-white">LIVE</h2>
            </div>

            {liveFixtures.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-panel p-4 text-xs text-textSub">
                現在進行中の試合はありません。
              </p>
            ) : (
              <div className="space-y-3">
                {liveFixtures.map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span>⏳</span>
              <h2 className="text-sm font-bold text-white">まもなく開始</h2>
            </div>

            {upcomingFixtures.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-panel p-4 text-xs text-textSub">
                試合はありません。
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingFixtures.map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span>✅</span>
              <h2 className="text-sm font-bold text-white">終了</h2>
            </div>

            {finishedFixtures.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-panel p-4 text-xs text-textSub">
                試合はありません。
              </p>
            ) : (
              <div className="space-y-3">
                {finishedFixtures.map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}