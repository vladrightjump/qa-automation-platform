import './globals.css';
import type { ReactNode } from 'react';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui/ToastQueue';
import Navbar from '@/components/Navbar';
import GeoBanner from '@/components/GeoBanner';

// Display: Fraunces — a soft, characterful serif with an optical/soft axis.
// Body: Hanken Grotesk — a warm humanist sans that sits well beneath it.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata = {
  title: 'Maison — QA Storefront',
  description: 'System under test for the QA Automation Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable}`}
    >
      <body className="bg-paper text-ink antialiased">
        {/* Fine paper grain over the warm wash, beneath all content. */}
        <div className="grain-overlay" aria-hidden="true" />
        <ToastProvider>
          <AuthProvider>
            <LocaleProvider>
              <Navbar />
              <GeoBanner />
              <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                {children}
              </main>
            </LocaleProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
