'use client';

import { useState } from 'react';
import { REPORT_REASONS } from '@/lib/constants';
import { currentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Props = {
  messageId: string;
  reportedProfileId: string;
};

export function ReportButton({ messageId, reportedProfileId }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(
    REPORT_REASONS[0] ?? ''
  );
  const [detail, setDetail] = useState('');

  const closeModal = () => {
    if (submitting) return;
    setOpen(false);
    setSelectedReason(REPORT_REASONS[0] ?? '');
    setDetail('');
  };

  const report = async () => {
    if (submitting) return;

    const baseReason = selectedReason.trim();
    const extra = detail.trim();

    if (!baseReason) {
      window.alert('通報理由を選択してください。');
      return;
    }

    const reason = extra ? `${baseReason}：${extra}` : baseReason;

    setSubmitting(true);

    try {
      const reporterId = await currentUserId();

      if (!reporterId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const { error } = await supabase.from('message_reports').insert({
        message_id: messageId,
        reporter_id: reporterId,
        reported_profile_id: reportedProfileId,
        reason,
      });

      if (error) {
        if (error.code === '23505') {
          window.alert('このメッセージはすでに通報済みです。');
          return;
        }

        throw error;
      }

      window.alert('通報を受け付けました。');
      closeModal();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '通報に失敗しました。'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={submitting}
        className="ml-2 text-xs text-textSub transition hover:text-textMain disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? '送信中...' : '通報'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-textMain">
              メッセージを通報
            </h2>

            <p className="mt-2 text-sm leading-6 text-textSub">
              通報理由を選択してください。
            </p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((reason) => {
                const active = selectedReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      active
                        ? 'border-accent bg-accent/15 text-textMain'
                        : 'border-white/10 bg-panelSoft text-textSub hover:border-white/20 hover:text-textMain'
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block text-sm font-medium text-textSub">
              詳細（任意）
            </label>

            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
              placeholder="補足があれば入力してください"
              className="mt-2 min-h-[96px] w-full rounded-xl border border-white/10 bg-panelSoft p-3 text-base text-textMain placeholder:text-textSub focus:border-accent focus:outline-none"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="h-11 flex-1 rounded-xl bg-gray-600 text-sm font-semibold text-white transition hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={report}
                disabled={submitting}
                className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}