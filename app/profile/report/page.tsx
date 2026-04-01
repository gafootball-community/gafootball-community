'use client';

import Link from 'next/link';

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-4 text-sm text-textMain">
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-panelSoft px-4 py-2 text-sm transition hover:border-accent/40 hover:bg-white/10"
      >
        ← 戻る
      </Link>

      <h1 className="mb-4 text-xl font-bold">問題を報告</h1>

      <p className="mb-4">
        本サービスに関する問題や不具合、違反行為の報告は以下のメールアドレスまでご連絡ください。
      </p>

      <div className="mb-4 rounded-xl bg-panelSoft p-4">
        <p className="break-all font-semibold">
          gafootballcenter@gmail.com
        </p>
      </div>

      <div className="space-y-2 text-sm text-textSub">
        <p>・不具合の報告</p>
        <p>・ユーザー通報</p>
        <p>・ご意見・ご要望</p>
      </div>

      <p className="mt-6 text-xs text-textSub">
        ※内容によっては返信できない場合があります。
      </p>
    </main>
  );
}