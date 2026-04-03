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
      className={`min-w-0 overflow-x-auto no-scrollbar ${
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

export function TimelineHeader({ fixture }: { fixture: Fixture }) {
  return (
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
  );
}