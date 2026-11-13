/**
 * Path helpers for running under a sub-path (GitHub Pages serves the app at
 * `/<repo>/`). `next/link` and `useRouter` add basePath automatically; only
 * raw URLs (window.location, emailRedirectTo, manifest link) need BASE_PATH.
 */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const DEFAULT_AFTER_LOGIN = '/study';

const PUBLIC_PREFIXES = ['/login', '/auth'] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Sanitise the `?next=` redirect target: only same-app absolute paths are
 * allowed, so a crafted link cannot bounce the user to another origin.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_LOGIN;
  const isInternal = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\');
  if (!isInternal) return DEFAULT_AFTER_LOGIN;
  const pathname = next.split(/[?#]/, 1)[0];
  if (isPublicPath(pathname)) return DEFAULT_AFTER_LOGIN;
  return next;
}
