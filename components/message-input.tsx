'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth';

type Props = {
  roomId: string;
};

export function MessageInput({ roomId }: Props) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();

    const content = value.trim();
    if (!content || sending) return;

    setSending(true);

    try {
      const profileId = await currentUserId();
      if (!profileId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        profile_id: profileId,
        content,
      });

      if (error) throw error;

      setValue('');
    } catch (e) {
      console.error('send message error:', e);
      window.alert(
        e instanceof Error
          ? e.message
          : 'メッセージ送信に失敗しました。'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={sendMessage}
      className="fixed inset-x-0 bottom-[calc(3.9rem+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-panel/95 px-3 py-2 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="メッセージを入力"
          className="h-11 flex-1 rounded-full border border-white/10 bg-panelSoft px-4 text-base text-textMain placeholder:text-textSub focus:border-accent focus:outline-none"
          maxLength={500}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <button
          type="submit"
          disabled={sending || value.trim().length === 0}
          className="h-11 rounded-full bg-accent px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? '送信中' : '送信'}
        </button>
      </div>
    </form>
  );
}