'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'ルーム' },
  { href: '/profile', label: 'プロフィール' }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md border-t border-zinc-800 bg-card">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3 text-center text-sm ${active ? 'text-accent' : 'text-zinc-400'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
