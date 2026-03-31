import { NextResponse } from 'next/server';
import {
  mapLeagueIdToRoomSlug,
  syncLiveFiveLeagueEvents,
} from '../../../lib/liveFootball';

export async function GET() {
  try {
    const fixtures = await syncLiveFiveLeagueEvents();

    const result = fixtures
      .map((match) => ({
        fixtureId: match.fixture.id,
        roomSlug: mapLeagueIdToRoomSlug(match.league.id),
        leagueId: match.league.id,
        leagueName: match.league.name,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeGoals: match.goals.home ?? 0,
        awayGoals: match.goals.away ?? 0,
        elapsed: match.fixture.status?.elapsed ?? null,
      }))
      .filter((match) => match.roomSlug !== null);

    return NextResponse.json({
      ok: true,
      matches: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}