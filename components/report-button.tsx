'use client';

import { useState } from 'react';
import { REPORT_REASONS } from '@/lib/constants';
import { currentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Props = {
  messageId: string;
};

export function ReportButton({ messageId }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const report = async () => {
    if (submitting) return;

    const reason = window.prompt(
      `通報理由を入力してください\n${REPORT_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
      REPORT_REASONS[0]
    );
    if (!reason) return;

    setSubmitting(true);
    try {
      const reporterId = await currentUserId();
      if (!reporterId) throw new Error('ログイン情報が見つかりません。');

      const { error } = await supabase.from('message_reports').insert({
        message_id: messageId,
        reporter_id: reporterId,
        reason
      });

      if (error) {
        if (error.code === '23505') {
          window.alert('このメッセージはすでに通報済みです。');
          return;
        }
        throw error;
      }

      window.alert('通報を受け付けました。');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '通報に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={report}
      className="ml-2 text-xs text-textSub transition hover:text-textMain"
    >
      通報
    </button>
  );
}
