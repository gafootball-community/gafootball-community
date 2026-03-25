import { DEFAULT_NICKNAME } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function ensureAnonymousProfile(): Promise<Profile> {
  let {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      throw new Error(error?.message ?? '匿名ログインに失敗しました。');
    }
    session = data.session;
  }

  const userId = session.user.id;

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

  const nickname = `${DEFAULT_NICKNAME}${String(userId).slice(0, 4)}`;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, nickname })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? 'プロフィール作成に失敗しました。');
  }

  return inserted as Profile;
}

export async function currentUserId() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id;
}
