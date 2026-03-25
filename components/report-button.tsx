'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  messageId: string;
  reporterId: string;
};

export function ReportButton({ messageId, reporterId }: Props) {
  const [done, setDone] = useState(false);

  async function report() {
    if (done) return;
    const { error } = await supabase.from('message_reports').insert({
      message_id: messageId,
      reporter_id: reporterId,
      reason: 'user_report'
    });
    if (!error) setDone(true);
  }

  return (
    <button onClick={report} className="text-xs text-zinc-500 hover:text-zinc-300">
      {done ? '通報済み' : '通報'}
    </button>
  );
}
