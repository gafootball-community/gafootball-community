import { NextRequest, NextResponse } from 'next/server';

type LeagueSlug =
  | 'premier-league'
  | 'la-liga'
  | 'bundesliga'
  | 'serie-a'
  | 'ligue-1'
  | 'champions-league';

const LEAGUE_ID_MAP: Record<LeagueSlug, number> = {
  'premier-league': 39,
  'la-liga': 140,
  bundesliga: 78,
  'serie-a': 135,
  'ligue-1': 61,
  'champions-league': 2,
};

// 欧州シーズン判定
function getCurrentSeasonForEurope() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year : year - 1;
}

// standingsをフラット化（CL対応）
function normalizeStandingsRows(rawStandings: any): any[] {
  if (!Array.isArray(rawStandings)) return [];
  return rawStandings.flatMap((group) =>
    Array.isArray(group) ? group : []
  );
}

// API取得関数
async function fetchStandings(
  leagueId: number,
  season: number,
  apiKey: string
) {
  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    {
      headers: {
        'x-apisports-key': apiKey,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'FOOTBALL_API_KEY is not set' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const league = searchParams.get('league') as LeagueSlug | null;

    if (!league || !(league in LEAGUE_ID_MAP)) {
      return NextResponse.json(
        { ok: false, error: 'valid league is required' },
        { status: 400 }
      );
    }

    const leagueId = LEAGUE_ID_MAP[league];

    // 👇 開発 or 本番で分岐
    let season =
      process.env.NODE_ENV === 'development'
        ? 2024 // 無料プラン対策
        : getCurrentSeasonForEurope();

    let data = await fetchStandings(leagueId, season, apiKey);

    // ❗ フォールバック（データが空のとき）
    if (!data?.response?.length) {
      season = season - 1;
      data = await fetchStandings(leagueId, season, apiKey);
    }

    const rawStandings = data?.response?.[0]?.league?.standings;
    const table = normalizeStandingsRows(rawStandings);

    const rows = table.map((row: any) => ({
      rank: Number(row?.rank ?? 0),
      team: row?.team?.name ?? '',
      played: Number(row?.all?.played ?? 0),
      goalDiff: Number(row?.goalsDiff ?? 0),
      points: Number(row?.points ?? 0),
    }));

    return NextResponse.json({
      ok: true,
      league,
      season,
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}