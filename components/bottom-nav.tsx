'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { MessageCircleMore, Newspaper, User, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/', label: 'ルーム', icon: MessageCircleMore },
  { href: '/standings', label: '順位', icon: BarChart3 },
  { href: '/articles', label: '記事', icon: Newspaper, special: true },
  { href: '/profile', label: 'プロフィール', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/terms' || pathname === '/privacy') {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-panel/90 pb-[max(env(safe-area-inset-bottom),0.2rem)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-4 pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === '/'
              ? pathname === '/' || pathname.startsWith('/rooms/')
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'relative flex min-h-[58px] flex-col items-center justify-center overflow-hidden rounded-2xl px-2.5 py-1.5 text-center transition',
                item.special && 'scale-[1.03]',
                item.special &&
                  'before:absolute before:inset-0 before:rounded-2xl before:bg-yellow-300/12 before:blur-xl before:opacity-60',
                active
                  ? item.special
                    ? 'border border-yellow-200/20 bg-gradient-to-b from-yellow-300/30 via-yellow-400/16 to-yellow-700/12 text-black shadow-[0_0_18px_rgba(255,215,0,0.38)]'
                    : 'bg-accent text-black'
                  : item.special
                  ? 'border border-yellow-300/10 bg-yellow-400/8 text-yellow-200 shadow-[0_0_8px_rgba(255,215,0,0.18)] hover:bg-yellow-400/15'
                  : 'bg-panelSoft text-textSub hover:text-textMain'
              )}
            >
              {item.special && (
                <>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300/12 blur-2xl" />
                  <div className="pointer-events-none absolute left-3 top-2 text-[9px] text-yellow-200/65">
                    ✦
                  </div>
                  <div className="pointer-events-none absolute right-3 top-2 text-[9px] text-yellow-200/55">
                    ✦
                  </div>
                </>
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={clsx(
                    'mb-0.5 flex h-7 w-7 items-center justify-center rounded-lg',
                    item.special
                      ? active
                        ? 'bg-yellow-200/18 shadow-[0_0_10px_rgba(255,215,0,0.22)]'
                        : 'bg-yellow-300/8'
                      : active
                      ? 'bg-white/10'
                      : 'bg-transparent'
                  )}
                >
                  <Icon
                    className={clsx(
                      item.special ? 'h-4.5 w-4.5' : 'h-4 w-4',
                      item.special
                        ? active
                          ? 'text-yellow-100'
                          : 'text-yellow-200'
                        : active
                        ? 'text-black'
                        : 'text-textSub'
                    )}
                    strokeWidth={2.2}
                  />
                </div>

                <span
                  className={clsx(
                    'text-[11px] font-semibold leading-none',
                    item.special
                      ? active
                        ? 'text-white'
                        : 'text-yellow-100'
                      : active
                      ? 'text-black'
                      : 'text-textSub'
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}