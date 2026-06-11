'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import TextInput from '@/components/ui/TextInput';
import Toast from '@/components/ui/Toast';

export default function AuthForm() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password);
      setToken(result.token, result.user);
      router.push('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[380px] mx-auto space-y-4">
      <div className="flex justify-center gap-4 text-[13.5px]">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold text-ink' : 'text-ink-faint hover:text-ink'}
        >
          Sign in
        </button>
        <span aria-hidden="true" className="text-ink-faint">·</span>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-semibold text-ink' : 'text-ink-faint hover:text-ink'}
        >
          Create account
        </button>
      </div>
      <TextInput
        data-testid="auth-email"
        type="email"
        required
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextInput
        data-testid="auth-password"
        type="password"
        required
        minLength={8}
        placeholder="password (min 8)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        data-testid="auth-submit"
        disabled={busy}
        className="w-full px-4 py-2.5 bg-clay-500 hover:bg-clay-600 text-card rounded-lg font-medium active:scale-95 disabled:bg-line-strong disabled:active:scale-100 transition-colors"
      >
        {busy ? '…' : mode === 'login' ? 'Sign in' : 'Register'}
      </button>
      {err && <Toast message={err} />}
    </form>
  );
}
