'use client';

import { useEffect, useState } from 'react';
import { ensureAnonymousProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await ensureAnonymousProfile();
        setProfile(p);
        setNickname(p.nickname);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'プロフィール取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const saveNickname = async () => {
    if (!profile) return;
    const next = nickname.trim();
    if (!next) {
      window.alert('ニックネームを入力してください。');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname: next })
        .eq('id', profile.id)
        .select('*')
        .single();

      if (error) throw error;
      setProfile(data as Profile);
      setNickname((data as Profile).nickname);
      window.alert('ニックネームを更新しました。');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '更新に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <h1 className="mt-2 text-2xl font-bold">プロフィール</h1>
      <p className="mt-2 text-sm text-textSub">ニックネームを設定すると、チャットで表示されます。</p>

      {loading ? (
        <p className="mt-6 text-sm text-textSub">読み込み中...</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-4">
          <label className="block text-sm font-medium text-textSub">ニックネーム</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-panelSoft px-3 text-textMain focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={saveNickname}
            disabled={saving}
            className="mt-4 h-11 w-full rounded-xl bg-accent font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存する
          </button>
        </div>
      )}
    </main>
  );
}
