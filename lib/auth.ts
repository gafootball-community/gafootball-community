import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function ensureProfileForUser(): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error('ログインが必要です。');
  }

  const userId = user.id;

  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (profile) {
    return profile as Profile;
  }

  const nickname = '名無し';
  const avatarUrl = null;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nickname,
      avatar_url: avatarUrl,
      bio: '',
      favorite_club: '',
    })
    .select('*')
    .single();

  if (!insertError && inserted) {
    return inserted as Profile;
  }

  const isDuplicate =
    insertError?.message?.includes('duplicate key value') ||
    insertError?.code === '23505';

  if (isDuplicate) {
    const { data: existing, error: retryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (retryError || !existing) {
      throw new Error(
        retryError?.message ?? 'プロフィール取得に失敗しました。'
      );
    }

    return existing as Profile;
  }

  throw new Error(insertError?.message ?? 'プロフィール作成に失敗しました。');
}

export async function currentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user?.id ?? null;
}