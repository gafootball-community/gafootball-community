export type Room = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Message = {
  id: string;
  room_id: string;
  profile_id: string;
  content: string;
  is_hidden: boolean;
  is_deleted: boolean;
  created_at: string;
  profile?: {
    nickname: string;
  } | null;
};
