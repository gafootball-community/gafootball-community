'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  roomId: string;
  profileId: string;
  onSent: () => void;
};

export function MessageInput({ roomId, profileId, onSent }: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      profile_id: profileId,
      content: trimmed
    });
    setSending(false);

    if (!error) {
      setContent('');
      onSent();
    }
  }

  return (
    <form onSubmit={onSubmit} className="fixed bottom-14 left-0 right-0 mx-auto max-w-md border-t border-zinc-800 bg-card p-3">
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={300}
          placeholder="メッセージを入力"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </form>
  );
}
