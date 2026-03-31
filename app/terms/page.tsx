'use client';

import Link from 'next/link';

export default function TermsPage() {
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
      <p className="mb-4 text-sm text-textSub">利用規約</p>

      <p className="mb-4">
        本利用規約（以下「本規約」）は、G+A Football Community（以下「本サービス」）の利用条件を定めるものです。
        ユーザーは、本規約に同意の上、本サービスを利用するものとします。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第1条（サービス内容）</h2>
      <p className="mb-4">
        本サービスは、サッカーに関する情報交換およびチャットを目的とした匿名コミュニティサービスです。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第2条（利用条件）</h2>
      <p className="mb-4">
        ユーザーは、自己の責任において本サービスを利用するものとし、
        本サービスの利用により発生した一切の行為および結果について責任を負うものとします。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第3条（禁止事項）</h2>
      <p className="mb-2">ユーザーは以下の行為を行ってはなりません。</p>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>誹謗中傷、差別、暴言、嫌がらせ行為</li>
        <li>スパム、広告、勧誘、宣伝行為</li>
        <li>違法行為または公序良俗に反する内容の投稿</li>
        <li>著作権、肖像権、プライバシー権を侵害する行為</li>
        <li>なりすまし行為</li>
        <li>不正アクセスやサービスの妨害行為</li>
        <li>その他、運営が不適切と判断する行為</li>
      </ul>

      <h2 className="mb-2 mt-6 font-bold">第4条（投稿内容の取り扱い）</h2>
      <p className="mb-4">
        ユーザーが投稿したコンテンツは、ユーザー自身の責任において投稿されるものであり、
        本サービスはその内容の正確性・合法性について保証しません。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第5条（投稿の削除・利用制限）</h2>
      <p className="mb-4">
        運営は、ユーザーが本規約に違反した場合、または不適切と判断した場合、
        事前の通知なく投稿の削除、アカウント制限、アクセス制限等の措置を行うことができます。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第6条（サービスの変更・停止）</h2>
      <p className="mb-4">
        運営は、ユーザーへの事前通知なく、本サービスの内容の変更、追加、停止を行うことができます。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第7条（広告掲載）</h2>
      <p className="mb-4">
        本サービスは、当社または第三者の広告を掲載する場合があります。
        また、広告配信のためにクッキー等の技術を使用することがあります。
        ユーザーはこれらに同意の上、本サービスを利用するものとします。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第8条（免責事項）</h2>
      <p className="mb-4">
        本サービスの利用によりユーザーに生じたいかなる損害についても、
        運営は一切の責任を負いません。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第9条（規約の変更）</h2>
      <p className="mb-4">
        本規約は、必要に応じて予告なく変更されることがあります。
        変更後の規約は、本サービス上に掲載された時点で効力を生じます。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第10条（準拠法・管轄）</h2>
      <p className="mb-4">
        本規約の解釈および適用は日本法に準拠し、
        本サービスに関して生じた紛争については、
        運営者の所在地を管轄する日本の裁判所を専属的合意管轄とします。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第11条（年齢制限）</h2>
      <p className="mb-4">
        未成年の方は、保護者の同意を得た上で本サービスを利用するものとします。
      </p>

      <h2 className="mb-2 mt-6 font-bold">第12条（お問い合わせ）</h2>
      <p className="mb-4">
        本サービスに関するお問い合わせは、運営が定める方法により受け付けます。
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