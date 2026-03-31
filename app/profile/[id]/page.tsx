'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProfile(data as Profile);
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : 'プロフィール取得に失敗しました。'
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-sm text-textSub">読み込み中...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-4">
        <Link href="/" className="text-xs text-accent">
          ← 戻る
        </Link>
        <p className="mt-4 text-sm text-textSub">
          ユーザーが見つかりません。
        </p>
      </main>
    );
  }

  return (
    <main className="p-4">
      <Link href="/" className="text-xs text-accent">
        ← 戻る
      </Link>

      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-white/10 bg-panel p-6">
        <div className="flex flex-col items-center text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname ?? 'avatar'}
              className="h-24 w-24 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-3xl">
              👤
            </div>
          )}

          <h1 className="mt-4 text-2xl font-bold">
            {profile.nickname ?? '匿名ユーザー'}
          </h1>

          {profile.bio ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-textSub">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-3 text-sm text-textSub">
              自己紹介は未設定です。
            </p>
          )}

          {profile.favorite_club ? (
            <div className="mt-4 rounded-full bg-panelSoft px-4 py-2 text-sm text-textMain">
              ⚽ お気に入りのクラブ: {profile.favorite_club}
            </div>
          ) : (
            <div className="mt-4 rounded-full bg-panelSoft px-4 py-2 text-sm text-textSub">
              お気に入りのクラブは未設定です。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}