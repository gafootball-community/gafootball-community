'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'ルーム' },
  { href: '/profile', label: 'プロフィール' }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-panel/90 backdrop-blur pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2 px-4 pt-2">
        {navItems.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'rounded-xl px-4 py-3 text-center text-sm font-medium transition',
                active
                  ? 'bg-accent text-black'
                  : 'bg-panelSoft text-textSub hover:text-textMain'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
