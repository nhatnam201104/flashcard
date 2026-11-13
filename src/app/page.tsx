'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_AFTER_LOGIN } from '@/lib/paths';

// Static export has no server redirect; route on the client (basePath-aware).
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(DEFAULT_AFTER_LOGIN);
  }, [router]);
  return null;
}
