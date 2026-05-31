'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthValue } from './auth';

interface RequireAuthOptions {
  // When true, also bounce non-admin users to the home page once hydrated.
  requireAdmin?: boolean;
}

// Hydrate-aware auth guard shared by every protected page. Waits for
// `isHydrated` (so signed-in users aren't bounced on the first render before
// localStorage is read), then redirects to /login when there's no token. With
// `requireAdmin`, non-admins are sent to '/'. Returns the full auth value so
// callers can read `token`/`user`/`isHydrated`/`refreshCartCount` as before.
export function useRequireAuth(options: RequireAuthOptions = {}): AuthValue {
  const { requireAdmin = false } = options;
  const auth = useAuth();
  const { token, user, isHydrated } = auth;
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && user && user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isHydrated, token, user, requireAdmin, router]);

  return auth;
}
