'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type LeagueKey =
  | 'premier-league'
  | 'la-liga'
  | 'bundesliga'
  | 'serie-a'
  | 'ligue-1'
  | 'champions-league';

type StandingRow = {
  rank: number;
  team: string;
  played: number;
  goalDiff: number;
  points: number;
};

const leagueOptions: { key: LeagueKey; label: string }[] = [
  { key: 'premier-league', label: 'プレミア' },
  { key: 'la-liga', label: 'ラ・リーガ' },
  { key: 'bundesliga', label: 'ブンデス' },
  { key: 'serie-a', label: 'セリエA' },
  { key: 'ligue-1', label: 'リーグアン' },
  { key: 'champions-league', label: 'CL' },
];

function formatGoalDiff(goalDiff: number) {
  if (goalDiff > 0) return `+${goalDiff}`;
  return `${goalDiff}`;
}

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] =
    useState<LeagueKey>('premier-league');
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentLeagueLabel =
    leagueOptions.find((league) => league.key === selectedLeague)?.label ?? '';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/standings?league=${encodeURIComponent(selectedLeague)}`,
          { cache: 'no-store' }
        );

        const data = await res.json();

        if (!mounted) return;

        if (!data?.ok) {
          throw new Error(data?.error ?? '順位表の取得に失敗しました。');
        }

        setRows((data.rows ?? []) as StandingRow[]);
        setSeason(data.season ?? null);
      } catch (err) {
        if (!mounted) return;

        setRows([]);
        setSeason(null);
        setError(
          err instanceof Error ? err.message : '順位表の取得に失敗しました。'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedLeague]);

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-4 text-textMain">
      <h1 className="text-2xl font-bold">順位表</h1>
      <p className="mt-2 text-sm text-textSub">
        各リーグの順位を確認できます。
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {leagueOptions.map((league) => {
          const active = selectedLeague === league.key;

          return (
            <button
              key={league.key}
              type="button"
              onClick={() => setSelectedLeague(league.key)}
              className={clsx(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'border-accent bg-accent text-black'
                  : 'border-white/10 bg-panelSoft text-textSub hover:border-white/20 hover:text-textMain'
              )}
            >
              {league.label}
            </button>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-panel p-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{currentLeagueLabel}</h2>
            <p className="mt-1 text-xs text-textSub">
              {season ? `${season}-${season + 1} シーズン` : 'シーズン取得中'}
            </p>
          </div>

          <div className="rounded-full bg-panelSoft px-3 py-1 text-xs text-textSub">
            {loading ? '更新中' : '最新'}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[44px_minmax(0,1.6fr)_44px_64px_44px] bg-white/5 px-3 py-3 text-xs font-semibold text-textSub">
              <div>順位</div>
              <div>クラブ</div>
              <div className="text-center">試合</div>
              <div className="text-center">得失点差</div>
              <div className="text-center">勝点</div>
            </div>

            <div className="divide-y divide-white/10">
              {rows.map((row) => (
                <div
                  key={`${selectedLeague}-${row.rank}-${row.team}`}
                  className="grid grid-cols-[44px_minmax(0,1.6fr)_44px_64px_44px] items-center px-3 py-3"
                >
                  <div>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-panelSoft text-sm font-bold text-textMain">
                      {row.rank}
                    </span>
                  </div>

                  <div className="min-w-0 pr-2 text-sm font-semibold text-white overflow-x-auto whitespace-nowrap no-scrollbar">
                    <span className="inline-block min-w-max">
                      {row.team}
                    </span>
                  </div>

                  <div className="text-center text-sm text-textMain">
                    {row.played}
                  </div>

                  <div className="text-center text-sm font-bold text-textMain">
                    {formatGoalDiff(row.goalDiff)}
                  </div>

                  <div className="text-center text-sm font-extrabold text-white">
                    {row.points}
                  </div>
                </div>
              ))}

              {!loading && rows.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-textSub">
                  順位データがありません。
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}