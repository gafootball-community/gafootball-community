'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  const backHref = '/';
  const topBackLabel = '← ログイン画面に戻る';
  const bottomBackLabel = 'ログイン画面に戻る';

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-4 text-sm leading-relaxed text-textMain">
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center rounded-full border border-white/10 bg-panelSoft px-4 py-2 text-sm font-medium text-textMain transition hover:border-accent/40 hover:bg-white/10"
        >
          {topBackLabel}
        </Link>
      </div>

      <h1 className="mb-2 text-xl font-bold">G+A Football Community</h1>
      <p className="mb-4 text-sm text-textSub">プライバシーポリシー</p>

      <p className="mb-4">
        本プライバシーポリシーは、G+A Football Community（以下「本サービス」）における
        ユーザー情報の取り扱いについて定めるものです。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第1条（取得する情報）</h2>
      <p className="mb-2">本サービスでは、以下の情報を取得する場合があります。</p>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>ニックネーム、プロフィール情報</li>
        <li>投稿内容（メッセージ）</li>
        <li>アクセスログ、利用状況</li>
        <li>端末情報、IPアドレス、ブラウザ情報</li>
      </ul>

      <h2 className="mb-2 mt-6 font-bold">第2条（利用目的）</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>サービスの提供および改善のため</li>
        <li>不正利用の防止および対応のため</li>
        <li>ユーザーサポートのため</li>
        <li>サービス品質向上のための分析</li>
      </ul>

      <h2 className="mb-2 mt-6 font-bold">第3条（第三者提供）</h2>
      <p className="mb-4">
        本サービスは、法令に基づく場合を除き、ユーザーの個人情報を第三者に提供しません。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第4条（外部サービスの利用）</h2>
      <p className="mb-4">
        本サービスでは、認証や分析のために外部サービス（例：Supabase等）を利用する場合があります。
        これらのサービスにおいて、ユーザー情報が処理されることがあります。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第5条（クッキー等の利用）</h2>
      <p className="mb-4">
        本サービスは、利便性向上や分析のためにクッキーや類似技術を使用する場合があります。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第6条（データの管理）</h2>
      <p className="mb-4">
        本サービスは、ユーザー情報の漏えい、滅失、毀損を防止するために適切な安全対策を講じます。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第7条（ユーザーの権利）</h2>
      <p className="mb-4">
        ユーザーは、自己の情報について、開示、訂正、削除を求めることができます。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第8条（ポリシーの変更）</h2>
      <p className="mb-4">
        本ポリシーは、必要に応じて予告なく変更されることがあります。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第9条（お問い合わせ）</h2>
      <p className="mb-4">
        本ポリシーに関するお問い合わせは、運営が定める方法により受け付けます。
      </p>

      <p className="mt-8 text-xs text-textSub">制定日：2026年3月</p>

      <div className="mt-8">
        <Link
          href={backHref}
          className="inline-flex items-center rounded-xl bg-accent px-4 py-3 font-semibold text-black transition hover:opacity-90"
        >
          {bottomBackLabel}
        </Link>
      </div>
    </main>
  );
}