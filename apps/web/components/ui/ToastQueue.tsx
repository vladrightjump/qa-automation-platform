'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'> & { id?: string; durationMs?: number }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const DEFAULT_DURATION_MS = 2200;
const VARIANT_DOT: Record<ToastVariant, string> = {
  success: 'bg-sage-500',
  error: 'bg-danger-500',
  warning: 'bg-accent-500',
  info: 'bg-clay-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastValue['push']>(
    ({ variant, message, id, durationMs = DEFAULT_DURATION_MS }) => {
      const toastId =
        id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id: toastId, variant, message }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(toastId), durationMs);
      }
      return toastId;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div
        data-testid="toast-queue"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid={`toast-${t.variant}`}
            role="status"
            className="animate-slide-up bg-ink text-paper rounded-lg px-5 py-3 text-[13.5px] shadow-pop flex items-center gap-3 min-w-[16rem]"
          >
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${VARIANT_DOT[t.variant]}`}
            />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              data-testid={`toast-dismiss-${t.id}`}
              aria-label="Dismiss"
              className="text-paper/60 hover:text-paper transition-opacity"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
