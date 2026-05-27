import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <AuthForm />
    </section>
  );
}
