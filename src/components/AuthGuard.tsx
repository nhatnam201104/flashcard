'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthStatus = 'checking' | 'authed';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side replacement for the old middleware: the app is a static export
 * (GitHub Pages), so there is no server to gate routes. Data is still
 * protected by Supabase RLS — this guard only handles navigation.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus>('checking');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const toLogin = () => router.replace(`/login?next=${encodeURIComponent(pathname)}`);

    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.session) toLogin();
      else setStatus('authed');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) toLogin();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (status === 'checking') {
    return <div className="flex min-h-dvh flex-1 items-center justify-center text-sm text-muted-foreground">Đang tải…</div>;
  }
  return <>{children}</>;
}
