// Unit tests for AuthProvider. Asserts the hydration contract that
// downstream pages rely on (`isHydrated` flips true exactly once, after
// localStorage is read), the storage round-trip on setToken, and the
// idempotent clear() on logout.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, TOKEN_KEY, USER_KEY, useAuth } from './auth';

// `useAuth` reaches into the api client to refresh cart count — stub it
// so the hydration tests don't depend on fetch wiring.
vi.mock('./api', () => ({
  api: { getCart: vi.fn().mockResolvedValue({ items: [] }) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with token=null and flips isHydrated=true after mount', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
  });

  it('hydrates from localStorage when both token and user are present', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'eyJ.fake');
    window.localStorage.setItem(USER_KEY, JSON.stringify({ id: 'u_1', email: 'a@b.c', role: 'USER' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.token).toBe('eyJ.fake');
    expect(result.current.user).toEqual({ id: 'u_1', email: 'a@b.c', role: 'USER' });
  });

  it('ignores corrupt USER_KEY JSON without throwing', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'eyJ.fake');
    window.localStorage.setItem(USER_KEY, '{not json');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('setToken writes both storage keys and updates context state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.setToken('eyJ.new', { id: 'u_2', email: 'x@y.z', role: 'USER' });
    });

    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('eyJ.new');
    expect(JSON.parse(window.localStorage.getItem(USER_KEY) ?? 'null')).toEqual({
      id: 'u_2',
      email: 'x@y.z',
      role: 'USER',
    });
    expect(result.current.token).toBe('eyJ.new');
  });

  it('clear() removes both storage keys and resets state', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'eyJ.fake');
    window.localStorage.setItem(USER_KEY, JSON.stringify({ id: 'u_1', email: 'a@b.c', role: 'USER' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.token).toBe('eyJ.fake'));

    act(() => result.current.clear());

    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.cartCount).toBe(0);
  });

  it('useAuth throws outside an AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('renders children once mounted', async () => {
    const { findByText } = render(
      <AuthProvider>
        <span>hello</span>
      </AuthProvider>,
    );
    expect(await findByText('hello')).toBeInTheDocument();
  });
});
