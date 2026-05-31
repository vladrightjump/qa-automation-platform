'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Toast from './Toast';

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
    <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold' : 'text-ink-faint'}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-semibold' : 'text-ink-faint'}
        >
          Create account
        </button>
      </div>
      <input
        data-testid="auth-email"
        type="email"
        required
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded p-2"
      />
      <input
        data-testid="auth-password"
        type="password"
        required
        minLength={8}
        placeholder="password (min 8)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded p-2"
      />
      <button
        data-testid="auth-submit"
        disabled={busy}
        className="px-4 py-2 bg-clay-500 text-card rounded disabled:bg-line-strong"
      >
        {busy ? '…' : mode === 'login' ? 'Sign in' : 'Register'}
      </button>
      {err && <Toast message={err} />}
    </form>
  );
}
