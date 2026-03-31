'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type MatchEventType = 'goal' | 'cancelled_goal';
type TeamSide = 'home' | 'away';

type MatchEvent = {
  id: string;
  fixture_id: number;
  room_slug: string;
  event_type: MatchEventType;
  team_side: TeamSide;
  minute: number | null;
  home_goals: number;
  away_goals: number;
  player_name: string | null;
  related_event_id: string | null;
  home_team: string;
  away_team: string;
  created_at: string;
};

type Props = {
  roomSlug: string;
};

export function GoalTickerQueue({ roomSlug }: Props) {
  const [queue, setQueue] = useState<MatchEvent[]>([]);
  const [current, setCurrent] = useState<MatchEvent | null>(null);
  const [phase, setPhase] = useState<'idle' | 'enter' | 'show' | 'exit'>('idle');

  const displayedEventIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/live-events?roomSlug=${encodeURIComponent(roomSlug)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();

        if (!mounted || !data?.ok) return;

        const events = ((data.events ?? []) as MatchEvent[])
          .filter((event) => event.room_slug === roomSlug)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        // 初回ロードは過去イベントをスキップ
        if (!initializedRef.current) {
          for (const event of events) {
            displayedEventIdsRef.current.add(event.id);
          }
          initializedRef.current = true;
          return;
        }

        const newEvents = events.filter(
          (event) => !displayedEventIdsRef.current.has(event.id)
        );

        if (newEvents.length === 0) return;

        for (const event of newEvents) {
          displayedEventIdsRef.current.add(event.id);
        }

        setQueue((prevQueue) => [...prevQueue, ...newEvents]);
      } catch (error) {
        console.error('goal ticker events fetch error', error);
      }
    };

    void load();

    const interval = setInterval(() => {
      void load();
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [roomSlug]);

  useEffect(() => {
    if (phase === 'idle' && queue.length > 0) {
      const next = queue[0];
      setCurrent(next);
      setQueue((prev) => prev.slice(1));
      setPhase('enter');
    }
  }, [phase, queue]);

  useEffect(() => {
    if (phase === 'enter') {
      const t = setTimeout(() => setPhase('show'), 80);
      return () => clearTimeout(t);
    }

    if (phase === 'show') {
      const t = setTimeout(() => setPhase('exit'), 5000);
      return () => clearTimeout(t);
    }

    if (phase === 'exit') {
      const t = setTimeout(() => {
        setCurrent(null);
        setPhase('idle');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!current) return null;

  const isCancelled = current.event_type === 'cancelled_goal';
  const canceledTeamName =
    current.team_side === 'home' ? current.home_team : current.away_team;

  return (
    <div className="mb-4 overflow-hidden">
      <div
        className={clsx(
          'relative flex items-center gap-3 rounded-2xl border px-5 py-4 text-white',
          'transform transition-all duration-500 ease-in-out will-change-transform',
          {
            '-translate-x-full opacity-0': phase === 'enter',
            'translate-x-0 opacity-100': phase === 'show',
            'translate-x-full opacity-0': phase === 'exit',
            'border-emerald-300/50 bg-gradient-to-b from-emerald-900/95 via-emerald-800/80 to-emerald-950/95 shadow-[0_0_35px_rgba(34,197,94,0.45)]':
              !isCancelled,
            'border-rose-300/50 bg-gradient-to-b from-rose-900/95 via-rose-800/80 to-rose-950/95 shadow-[0_0_35px_rgba(244,63,94,0.38)]':
              isCancelled,
          }
        )}
      >
        <div
          className={clsx('absolute inset-x-0 top-0 h-px', {
            'bg-emerald-300/70': !isCancelled,
            'bg-rose-300/70': isCancelled,
          })}
        />
        <div
          className={clsx('absolute inset-x-0 bottom-0 h-px', {
            'bg-emerald-300/40': !isCancelled,
            'bg-rose-300/40': isCancelled,
          })}
        />

        <span className="shrink-0 text-xl">{isCancelled ? '📺' : '⚽'}</span>

        <span
          className={clsx('shrink-0 font-extrabold tracking-wide', {
            'text-emerald-300': !isCancelled,
            'text-rose-300': isCancelled,
          })}
        >
          {isCancelled ? 'NO GOAL' : 'GOAL'}
        </span>

        <span className="min-w-0 truncate font-semibold">
          {current.home_team}
        </span>

        <span className="shrink-0 px-2 text-lg font-extrabold">
          {current.home_goals} - {current.away_goals}
        </span>

        <span className="min-w-0 truncate font-semibold">
          {current.away_team}
        </span>

        {isCancelled && (
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-rose-200">
            {canceledTeamName}の得点取り消し
          </span>
        )}

        {current.player_name && (
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-bold">
            {current.player_name}
          </span>
        )}

        {current.minute !== null && (
          <span
            className={clsx('ml-auto shrink-0 text-lg font-extrabold', {
              'text-emerald-300': !isCancelled,
              'text-rose-300': isCancelled,
            })}
          >
            {current.minute}&apos;
          </span>
        )}
      </div>
    </div>
  );
}