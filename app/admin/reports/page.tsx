'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Report = {
  id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
  reported_profile_id: string | null;
  status: 'pending' | 'resolved';
  message: {
    id: string;
    content: string;
    profile_id: string;
    is_hidden: boolean;
  } | null;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace('/');
          return;
        }

        const { data: myProfile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (!myProfile?.is_admin) {
          window.alert('管理者のみアクセスできます。');
          router.replace('/');
          return;
        }

        const { data, error } = await supabase
          .from('message_reports')
          .select(`
            id,
            reason,
            created_at,
            reporter_id,
            reported_profile_id,
            status,
            message:messages (
              id,
              content,
              profile_id,
              is_hidden
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const normalizedReports: Report[] = (data ?? []).map((r: any) => ({
          id: r.id,
          reason: r.reason,
          created_at: r.created_at,
          reporter_id: r.reporter_id,
          reported_profile_id:
            r.reported_profile_id ?? r.message?.profile_id ?? null,
          status: r.status ?? 'pending',
          message: r.message
            ? {
                id: r.message.id,
                content: r.message.content,
                profile_id: r.message.profile_id,
                is_hidden: Boolean(r.message.is_hidden),
              }
            : null,
        }));

        setReports(normalizedReports);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : '通報一覧の取得に失敗しました。'
        );
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    void fetchReports();
  }, [router]);

  const hideMessage = async (reportId: string, messageId: string) => {
    const confirmed = window.confirm('このメッセージを非表示にしますか？');
    if (!confirmed) return;

    setWorkingId(reportId);

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_hidden: true })
        .eq('id', messageId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId && report.message
            ? {
                ...report,
                message: {
                  ...report.message,
                  is_hidden: true,
                },
              }
            : report
        )
      );

      window.alert('メッセージを非表示にしました。');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'メッセージ非表示に失敗しました。'
      );
    } finally {
      setWorkingId(null);
    }
  };

  const banUser = async (reportId: string, profileId: string) => {
    const confirmed = window.confirm('このユーザーを投稿停止にしますか？');
    if (!confirmed) return;

    setWorkingId(reportId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true, is_suspended: true })
        .eq('id', profileId);

      if (error) throw error;

      window.alert('ユーザーを投稿停止にしました。');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿停止に失敗しました。'
      );
    } finally {
      setWorkingId(null);
    }
  };

  const markResolved = async (reportId: string) => {
    setWorkingId(reportId);

    try {
      const { error } = await supabase
        .from('message_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? { ...report, status: 'resolved' }
            : report
        )
      );

      window.alert('対応済みにしました。');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '対応済み更新に失敗しました。'
      );
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 text-textMain">
      <h1 className="text-xl font-bold">通報一覧（管理者）</h1>

      {loading ? (
        <p className="mt-4 text-textSub">読み込み中...</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 text-textSub">通報はまだありません</p>
      ) : (
        <div className="mt-4 space-y-4">
          {reports.map((r) => {
            const isWorking = workingId === r.id;

            return (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-panel p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-textMain">
                    通報理由：{r.reason}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      r.status === 'resolved'
                        ? 'bg-green-600/20 text-green-300'
                        : 'bg-yellow-600/20 text-yellow-300'
                    }`}
                  >
                    {r.status === 'resolved' ? '対応済み' : '未対応'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-textSub">
                  通報者ID：{r.reporter_id}
                </p>

                <p className="mt-1 text-xs text-textSub">
                  通報日時：{new Date(r.created_at).toLocaleString('ja-JP')}
                </p>

                <div className="mt-4 rounded-xl bg-panelSoft p-3">
                  <p className="text-xs text-textSub">対象メッセージ</p>
                  <p className="mt-1 text-sm text-textMain">
                    {r.message?.content ?? '削除済みまたは取得不可'}
                  </p>

                  {r.message?.is_hidden && (
                    <p className="mt-2 text-xs text-red-300">
                      このメッセージは現在非表示です
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isWorking || !r.message || r.message.is_hidden}
                    onClick={() => {
                      if (r.message) {
                        void hideMessage(r.id, r.message.id);
                      }
                    }}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    メッセージ非表示
                  </button>

                  <button
                    type="button"
                    disabled={isWorking || !r.reported_profile_id}
                    onClick={() => {
                      if (r.reported_profile_id) {
                        void banUser(r.id, r.reported_profile_id);
                      }
                    }}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    投稿停止
                  </button>

                  <button
                    type="button"
                    disabled={isWorking || r.status === 'resolved'}
                    onClick={() => {
                      void markResolved(r.id);
                    }}
                    className="rounded-xl bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    対応済み
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}