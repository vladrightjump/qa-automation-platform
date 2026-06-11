import AuthForm from '@/components/features/auth/AuthForm';

export default function LoginPage() {
  return (
    <section className="py-10 space-y-6">
      <div className="text-center max-w-[380px] mx-auto space-y-1.5">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
          Sign in
        </h1>
        <p className="text-[13.5px] text-ink-faint">
          Welcome back — use a saved demo account or your own credentials.
        </p>
      </div>
      <AuthForm />
    </section>
  );
}
