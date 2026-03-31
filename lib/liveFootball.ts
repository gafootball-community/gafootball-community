import { supabase } from '@/lib/supabase';

const LIVE_FIVE_LEAGUE_IDS = [39, 140, 78, 135, 61, 2] as const;

type ApiFootballEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number;
    name?: string;
  };
  player?: {
    id?: number | null;
    name?: string | null;
  };
  assist?: {
    id?: number | null;
    name?: string | null;
  };
  type?: string;
  detail?: string;
  comments?: string | null;
};

type ApiFootballFixture = {
  fixture: {
    id: number;
    status?: {
      elapsed?: number | null;
    };
  };
  league: {
    id: number;
    name: string;
  };
  teams: {
    home: {
      id?: number;
      name: string;
    };
    away: {
      id?: number;
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  events?: ApiFootballEvent[];
};

type MatchEventRow = {
  id: string;
  fixture_id: number;
  room_slug: string;
  event_type: 'goal' | 'cancelled_goal';
  team_side: 'home' | 'away';
  minute: number | null;
  home_goals: number;
  away_goals: number;
  player_name: string | null;
  related_event_id: string | null;
  home_team: string;
  away_team: string;
};

export async function fetchLiveFiveLeagueFixtures(): Promise<ApiFootballFixture[]> {
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiKey) {
    throw new Error('FOOTBALL_API_KEY is not set');
  }

  const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: {
      'x-apisports-key': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Football API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  return (data.response ?? []).filter((match: ApiFootballFixture) =>
    LIVE_FIVE_LEAGUE_IDS.includes(Number(match.league.id) as (typeof LIVE_FIVE_LEAGUE_IDS)[number])
  );
}

export function mapLeagueIdToRoomSlug(leagueId: number) {
  switch (leagueId) {
    case 39:
      return 'premier-league';
    case 140:
      return 'la-liga';
    case 78:
      return 'bundesliga';
    case 135:
      return 'serie-a';
    case 61:
      return 'ligue-1';
    case 2:  
      return 'champions-legue';
    default:
      return null;
  }
}

function normalizeEventType(
  event: ApiFootballEvent
): 'goal' | 'cancelled_goal' | null {
  const type = (event.type ?? '').toLowerCase();
  const detail = (event.detail ?? '').toLowerCase();
  const comments = (event.comments ?? '').toLowerCase();

  const text = `${type} ${detail} ${comments}`;

  if (
    text.includes('goal disallowed') ||
    text.includes('disallowed goal') ||
    text.includes('goal cancelled') ||
    text.includes('goal canceled') ||
    text.includes('cancelled goal') ||
    text.includes('canceled goal')
  ) {
    return 'cancelled_goal';
  }

  if (
    type === 'goal' ||
    detail === 'normal goal' ||
    detail === 'own goal' ||
    detail === 'penalty'
  ) {
    return 'goal';
  }

  return null;
}

function detectTeamSide(
  fixture: ApiFootballFixture,
  event: ApiFootballEvent
): 'home' | 'away' {
  const eventTeamId = event.team?.id;
  const homeTeamId = fixture.teams.home.id;
  const awayTeamId = fixture.teams.away.id;

  if (eventTeamId && homeTeamId && eventTeamId === homeTeamId) {
    return 'home';
  }

  if (eventTeamId && awayTeamId && eventTeamId === awayTeamId) {
    return 'away';
  }

  const eventTeamName = event.team?.name ?? '';

  if (eventTeamName === fixture.teams.home.name) {
    return 'home';
  }

  return 'away';
}

function buildEventId(params: {
  fixtureId: number;
  eventType: 'goal' | 'cancelled_goal';
  teamSide: 'home' | 'away';
  minute: number | null;
  playerName: string | null;
  detail: string;
  index: number;
}) {
  const safePlayer = (params.playerName ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  const safeDetail = params.detail
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  return [
    'fixture',
    params.fixtureId,
    params.eventType,
    params.teamSide,
    params.minute ?? 'na',
    safePlayer,
    safeDetail || 'no-detail',
    params.index,
  ].join('-');
}

async function findRelatedGoalEventId(params: {
  fixtureId: number;
  teamSide: 'home' | 'away';
  minute: number | null;
}) {
  const minMinute = params.minute !== null ? Math.max(0, params.minute - 15) : 0;

  const { data, error } = await supabase
    .from('match_events')
    .select('id, minute')
    .eq('fixture_id', params.fixtureId)
    .eq('event_type', 'goal')
    .eq('team_side', params.teamSide)
    .gte('minute', minMinute)
    .order('minute', { ascending: false })
    .limit(1);

  if (error) {
    console.error('findRelatedGoalEventId error', error.message);
    return null;
  }

  return data?.[0]?.id ?? null;
}

function buildBaseEventRow(
  fixture: ApiFootballFixture,
  roomSlug: string,
  event: ApiFootballEvent,
  eventType: 'goal' | 'cancelled_goal',
  index: number
): MatchEventRow {
  const teamSide = detectTeamSide(fixture, event);
  const minute = event.time?.elapsed ?? fixture.fixture.status?.elapsed ?? null;
  const playerName = event.player?.name ?? null;
  const detail = event.detail ?? '';

  return {
    id: buildEventId({
      fixtureId: fixture.fixture.id,
      eventType,
      teamSide,
      minute,
      playerName,
      detail,
      index,
    }),
    fixture_id: fixture.fixture.id,
    room_slug: roomSlug,
    event_type: eventType,
    team_side: teamSide,
    minute,
    home_goals: fixture.goals.home ?? 0,
    away_goals: fixture.goals.away ?? 0,
    player_name: playerName,
    related_event_id: null,
    home_team: fixture.teams.home.name,
    away_team: fixture.teams.away.name,
  };
}

export async function storeFixtureEvents(
  fixture: ApiFootballFixture,
  roomSlug: string
) {
  const events = fixture.events ?? [];
  if (events.length === 0) return;

  const rows: MatchEventRow[] = [];

  for (const [index, event] of events.entries()) {
    const normalizedType = normalizeEventType(event);
    if (!normalizedType) continue;

    const row = buildBaseEventRow(fixture, roomSlug, event, normalizedType, index);

    if (normalizedType === 'cancelled_goal') {
      row.related_event_id = await findRelatedGoalEventId({
        fixtureId: fixture.fixture.id,
        teamSide: row.team_side,
        minute: row.minute,
      });
    }

    rows.push(row);
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from('match_events').upsert(rows, {
    onConflict: 'id',
  });

  if (error) {
    throw new Error(`match_events upsert failed: ${error.message}`);
  }
}

export async function syncLiveFiveLeagueEvents() {
  const fixtures = await fetchLiveFiveLeagueFixtures();

  for (const fixture of fixtures) {
    const roomSlug = mapLeagueIdToRoomSlug(fixture.league.id);
    if (!roomSlug) continue;

    await storeFixtureEvents(fixture, roomSlug);
  }

  return fixtures;
}