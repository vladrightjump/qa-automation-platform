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

const DEFAULT_DURATION_MS = 4000;
const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800 border-l-4 border-l-green-500',
  error: 'bg-red-50 border-red-200 text-red-800 border-l-4 border-l-red-500',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 border-l-4 border-l-yellow-500',
  info: 'bg-clay-50 border-clay-200 text-clay-700 border-l-4 border-l-clay-500',
};
const VARIANT_GLYPH: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
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
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid={`toast-${t.variant}`}
            role="status"
            className={`animate-slide-up border rounded-lg pl-2 pr-3 py-2 text-sm shadow-md flex items-center gap-2 min-w-[16rem] ${VARIANT_CLASSES[t.variant]}`}
          >
            <span
              aria-hidden="true"
              className="w-5 h-5 rounded-full bg-card/60 flex items-center justify-center text-xs font-bold"
            >
              {VARIANT_GLYPH[t.variant]}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              data-testid={`toast-dismiss-${t.id}`}
              aria-label="Dismiss"
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
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
