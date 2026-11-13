'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { BASE_PATH } from '@/lib/paths';

const items = [
  { href: '/study', label: 'Ôn tập', icon: '⚡' },
  { href: '/cards', label: 'Thẻ từ', icon: '🗂️' },
  { href: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-2xl items-stretch">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                active ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await getSupabaseBrowserClient().auth.signOut();
            window.location.href = `${BASE_PATH}/login`;
          }}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-lg leading-none">🚪</span>
          Thoát
        </button>
      </div>
    </nav>
  );
}
