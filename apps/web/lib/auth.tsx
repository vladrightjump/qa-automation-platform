'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, type User } from './api';

interface AuthState {
  token: string | null;
  user: User | null;
  cartCount: number;
}

interface AuthValue extends AuthState {
  // `isHydrated` becomes true once we've read localStorage. Protected pages
  // must wait for this before deciding to redirect to /login — otherwise the
  // first render (token still null) bounces signed-in users away before the
  // hydration effect runs.
  isHydrated: boolean;
  setToken: (token: string, user: User) => void;
  clear: () => void;
  refreshCartCount: () => Promise<void>;
}

// localStorage keys — tests inject these to skip the UI login walk.
export const TOKEN_KEY = 'qa_token';
export const USER_KEY = 'qa_user';

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    cartCount: 0,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (SSR-safe). Flag `isHydrated` so
  // downstream pages can hold off on redirect decisions until we've actually
  // read storage.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem(TOKEN_KEY);
    const userJson = window.localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        setState((s) => ({ ...s, token, user }));
      } catch {
        // ignore corrupt storage
      }
    }
    setIsHydrated(true);
  }, []);

  const refreshCartCount = useCallback(async () => {
    if (!state.token) {
      setState((s) => ({ ...s, cartCount: 0 }));
      return;
    }
    try {
      const cart = await api.getCart(state.token);
      const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
      setState((s) => ({ ...s, cartCount: count }));
    } catch {
      // 401 etc. — ignore; user can re-authenticate
    }
  }, [state.token]);

  useEffect(() => {
    void refreshCartCount();
  }, [refreshCartCount]);

  const setToken = useCallback((token: string, user: User) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ token, user, cartCount: 0 });
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null, cartCount: 0 });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, isHydrated, setToken, clear, refreshCartCount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
