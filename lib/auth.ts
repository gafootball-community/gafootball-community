import { supabase } from '@/lib/supabase';

export async function ensureAnonymousUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    await supabase.auth.signInAnonymously();
  }
}

export async function getCurrentUserId() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
