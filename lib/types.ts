export type Room = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  nickname: string;
  bio: string | null;
  favorite_club: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  room_id: string;
  profile_id: string;
  content: string;
  is_hidden: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'nickname' | 'id' | 'avatar_url'> | null;
};

export type MessageReport = {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
};

export type MatchEventType = 'goal' | 'cancelled_goal';
export type TeamSide = 'home' | 'away';

export type MatchEvent = {
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