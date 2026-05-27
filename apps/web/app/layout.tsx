import './globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'QA Storefront',
  description: 'System under test for the QA Automation Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main className="max-w-5xl mx-auto p-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
