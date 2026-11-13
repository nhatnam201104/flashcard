'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/paths';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackMessage />}>
      <AuthCallback />
    </Suspense>
  );
}

/**
 * Magic-link landing page. The browser client (PKCE, detectSessionInUrl)
 * exchanges `?code=` itself during initialisation; getSession() waits for
 * that to finish, so we only need to check the result and route on.
 */
function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const next = safeNextPath(params.get('next'));
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data, error }) => {
        router.replace(!error && data.session ? next : '/login?error=auth');
      });
  }, [params, router]);

  return <CallbackMessage />;
}

function CallbackMessage() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center text-sm text-muted-foreground">
      Đang đăng nhập…
    </div>
  );
}
