'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ensureProfileForUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await ensureProfileForUser();
        setProfile(p);
        setNickname(p.nickname);
        setBio(p.bio ?? '');
        setFavoriteClub(p.favorite_club ?? '');
        setAvatarBroken(false);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : 'プロフィール取得に失敗しました。'
        );
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveProfile = async () => {
    if (!profile) return;

    const next = nickname.trim();
    if (!next) {
      window.alert('ニックネームを入力してください。');
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() ?? 'jpg';
        const filePath = `${profile.id}/${uuidv4()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

        avatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nickname: next,
          bio,
          favorite_club: favoriteClub,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id)
        .select('*')
        .single();

      if (error) throw error;

      const updated = data as Profile;
      setProfile(updated);
      setNickname(updated.nickname);
      setBio(updated.bio ?? '');
      setFavoriteClub(updated.favorite_club ?? '');
      setAvatarFile(null);
      setPreviewUrl(null);
      setAvatarBroken(false);

      window.alert('プロフィールを更新しました。');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '更新に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('ログアウトしますか？');
    if (!confirmed) return;

    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.replace('/');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'ログアウトに失敗しました。'
      );
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('ログイン情報が見つかりません。');

      const { data: deletedRows, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
        .select('id');

      if (error) throw error;

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('プロフィールが削除されませんでした。');
      }

      setProfile(null);
      setNickname('');
      setBio('');
      setFavoriteClub('');
      setAvatarFile(null);
      setPreviewUrl(null);
      setAvatarBroken(false);
      setShowDeleteModal(false);

      await supabase.auth.signOut({ scope: 'global' });

      window.alert('アカウントを削除しました。');
      window.location.replace('/');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'アカウント削除に失敗しました。'
      );
    } finally {
      setDeleting(false);
    }
  };

  const isGoogleAvatar =
    !!profile?.avatar_url &&
    profile.avatar_url.includes('googleusercontent.com');

  const avatarSrc =
    !avatarBroken &&
    (previewUrl ||
      (profile?.avatar_url &&
      profile.avatar_url.trim() !== '' &&
      profile.avatar_url.startsWith('http') &&
      !isGoogleAvatar
        ? profile.avatar_url
        : null));

  return (
    <main className="relative">
      <div className="absolute right-0 top-0 z-30">
        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center text-2xl text-white"
        >
          ☰
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-panel/95 p-2 text-sm text-white shadow-lg backdrop-blur">
            <Link
              href="/terms?from=profile"
              className="block rounded-md px-3 py-2 hover:bg-white/10"
              onClick={() => setShowMenu(false)}
            >
              利用規約
            </Link>
            <Link
              href="/privacy?from=profile"
              className="block rounded-md px-3 py-2 hover:bg-white/10"
              onClick={() => setShowMenu(false)}
            >
              プライバシーポリシー
            </Link>
          </div>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-bold">プロフィール</h1>
      <p className="mt-2 text-sm text-textSub">
        ニックネームや情報を設定すると、チャットで表示されます。
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-textSub">読み込み中...</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-4">
          <div className="flex flex-col items-center">
            <label className="cursor-pointer">
              <div className="relative h-24 w-24">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="h-24 w-24 rounded-full border-2 border-white/10 object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/10 bg-panelSoft text-3xl">
                    👤
                  </div>
                )}

                <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-black shadow-lg">
                  ✎
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAvatarFile(file);

                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }

                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file));
                  } else {
                    setPreviewUrl(null);
                  }

                  setAvatarBroken(false);
                }}
              />
            </label>

            <p className="mt-3 text-xs text-textSub">タップしてアイコン変更</p>
          </div>

          <label className="mt-6 block text-sm font-medium text-textSub">
            ニックネーム
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-panelSoft px-3 text-textMain focus:border-accent focus:outline-none"
          />

          <label className="mt-4 block text-sm font-medium text-textSub">
            自己紹介
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            className="mt-2 min-h-[110px] w-full rounded-xl border border-white/10 bg-panelSoft p-3 text-textMain focus:border-accent focus:outline-none"
          />

          <label className="mt-4 block text-sm font-medium text-textSub">
            お気に入りのクラブ
          </label>
          <input
            value={favoriteClub}
            onChange={(e) => setFavoriteClub(e.target.value)}
            maxLength={50}
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-panelSoft px-3 text-textMain focus:border-accent focus:outline-none"
          />

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="mt-4 h-11 w-full rounded-xl bg-accent font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleLogout}
              className="h-11 w-full rounded-xl bg-gray-600 font-semibold text-white transition hover:bg-gray-500"
            >
              ログアウト
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="h-11 w-full rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500"
            >
              アカウントを削除
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-textMain">
              アカウントを削除しますか？
            </h2>

            <p className="mt-2 text-sm leading-6 text-textSub">
              この操作は元に戻せません。
              <br />
              プロフィール情報が削除されます。
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl bg-gray-600 text-sm font-semibold text-white transition hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}