import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth';
import { ToastProvider } from '@/components/ui/ToastQueue';
import { useApi } from './use-api';

vi.mock('./api', () => ({
  api: { getCart: vi.fn().mockResolvedValue({ items: [] }) },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

describe('useApi', () => {
  it('resolves data from the fetcher and exits loading', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApi(fetcher, []), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('captures error and exposes it', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(
      () => useApi(fetcher, [], { onError, suppressToast: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('skips the fetcher when authRequired and no token', async () => {
    const fetcher = vi.fn().mockResolvedValue('nope');
    renderHook(() => useApi(fetcher, [], { authRequired: true }), {
      wrapper,
    });
    // give the effect a tick to run
    await new Promise((r) => setTimeout(r, 10));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('exposes a reload that re-runs the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const { result } = renderHook(() => useApi(fetcher, []), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    fetcher.mockResolvedValueOnce('v2');
    await result.current.reload();
    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
