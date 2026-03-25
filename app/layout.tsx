import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GA Football Community',
  description: 'サッカーグループチャットコミュニティ'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="mx-auto max-w-md bg-bg">{children}</body>
    </html>
  );
}
