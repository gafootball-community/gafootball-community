import { supabase } from '@/lib/supabase';

export async function upsertRoomVisitor(profileId: string, roomSlug: string) {
  const { error } = await supabase.from('room_visitors').upsert({
    profile_id: profileId,
    room_slug: roomSlug,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('upsertRoomVisitor error', error);
  }
}

export async function deleteRoomVisitor(profileId: string) {
  const { error } = await supabase
    .from('room_visitors')
    .delete()
    .eq('profile_id', profileId);

  if (error) {
    console.error('deleteRoomVisitor error', error);
  }
}

export async function fetchRoomOnlineCounts() {
  const { data, error } = await supabase.rpc('get_room_online_counts');

  if (error) {
    console.error('fetchRoomOnlineCounts error', error);
    return {};
  }

  const counts: Record<string, number> = {};

  for (const row of data ?? []) {
    counts[row.room_slug] = Number(row.online_count);
  }

  return counts;
}