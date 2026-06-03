'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import LocaleSwitcher from './LocaleSwitcher';

export default function Navbar() {
  const { token, user, cartCount, clear } = useAuth();
  const { t } = useLocale();
  const [pulse, setPulse] = useState(false);
  const previousCount = useRef(cartCount);

  useEffect(() => {
    if (previousCount.current !== cartCount) {
      previousCount.current = cartCount;
      setPulse(true);
      const handle = setTimeout(() => setPulse(false), 320);
      return () => clearTimeout(handle);
    }
  }, [cartCount]);

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
        <Link
          href="/"
          data-testid="nav-products"
          className="group flex items-baseline gap-2 text-ink"
        >
          <span className="font-display text-2xl leading-none tracking-tight">
            Maison
          </span>
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-clay-500 translate-y-[-2px] group-hover:bg-clay-600 transition-colors"
          />
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.25em] text-ink-faint">
            est. 26
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1 text-sm">
          <LocaleSwitcher />
          <Link
            href="/cart"
            data-testid="nav-cart"
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-paper-deep transition-colors"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <span className="hidden sm:inline" data-testid="nav-cart-label">{t('nav.bag')}</span>
            <span
              data-testid="cart-count"
              className={`inline-block min-w-5 text-center bg-clay-500 text-card text-xs rounded-full px-2 py-0.5 font-semibold transition-transform ${pulse ? 'animate-pulse-once' : ''}`}
            >
              {cartCount}
            </span>
          </Link>
          {token ? (
            <>
              <Link
                href="/wishlist"
                data-testid="nav-wishlist"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-paper-deep transition-colors"
              >
                {t('nav.wishlist')}
              </Link>
              <Link
                href="/orders"
                data-testid="nav-orders"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-paper-deep transition-colors"
              >
                {t('nav.orders')}
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/products"
                  data-testid="nav-admin"
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-clay-50 text-clay-700 font-medium hover:bg-clay-100 transition-colors"
                >
                  {t('nav.admin')}
                </Link>
              )}
              <button
                onClick={clear}
                data-testid="nav-signout"
                title={user?.email}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full text-ink-soft hover:bg-paper-deep transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-clay-500 text-card text-xs font-semibold flex items-center justify-center ring-1 ring-clay-600/30">
                  {(user?.email?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="hidden md:inline text-xs text-ink-faint">
                  {t('nav.signOut')}
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              data-testid="nav-signin"
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-clay-500 text-card font-medium hover:bg-clay-600 transition-colors active:scale-95"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
