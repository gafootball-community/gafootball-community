'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { ensureAnonymousUser, getCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const [profileId, setProfileId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureAnonymousUser();
      const userId = await getCurrentUserId();
      if (!userId) return;
      setProfileId(userId);
      const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single();
      if (data) setNickname(data.nickname);
    })();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profileId || !nickname.trim()) return;

    const { error } = await supabase.from('profiles').upsert({
      id: profileId,
      nickname: nickname.trim()
    });

    if (!error) setSaved(true);
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-5 text-xl font-semibold">プロフィール</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-zinc-800 bg-card p-4">
        <label className="block text-sm text-zinc-300">ニックネーム</label>
        <input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
          maxLength={20}
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black">保存</button>
        {saved && <p className="text-xs text-accent">保存しました。</p>}
      </form>
      <BottomNav />
    </main>
  );
}
