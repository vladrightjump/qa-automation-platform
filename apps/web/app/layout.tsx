import './globals.css';
import type { ReactNode } from 'react';
import { Hanken_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/ToastQueue';
import Navbar from '@/components/features/nav/Navbar';

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata = {
  title: 'Arden — QA Storefront',
  description: 'System under test for the QA Automation Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={hanken.variable}>
      <body className="bg-paper text-ink antialiased">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
              {children}
            </main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
