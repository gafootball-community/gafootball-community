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
  profiles?: Pick<Profile, 'nickname' | 'id'> | null;
};

export type MessageReport = {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
};
