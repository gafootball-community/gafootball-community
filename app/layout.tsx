import type { Metadata } from 'next';
import './globals.css';
import { BottomNav } from '@/components/bottom-nav';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} | 固定ルームチャット`,
  description: '固定ルームでサッカーをリアルタイムに語るグループチャット'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-bg text-textMain">
        <div className="mx-auto min-h-dvh max-w-md px-4 pt-4">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
