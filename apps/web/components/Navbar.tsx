'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import LocaleSwitcher from './LocaleSwitcher';
import SearchBox from './features/catalog/SearchBox';

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
    <nav className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
        <Link
          href="/"
          data-testid="nav-products"
          className="inline-flex items-baseline text-ink"
        >
          <span className="text-[19px] font-bold leading-none tracking-[-0.01em]">
            arden
          </span>
          <span aria-hidden="true" className="text-clay-500 font-bold text-[19px] leading-none">
            .
          </span>
        </Link>

        <div className="hidden md:block flex-1 mx-6">
          <SearchBox />
        </div>

        <div className="flex items-center gap-1 text-sm">
          <LocaleSwitcher />
          <Link
            href="/cart"
            data-testid="nav-cart"
            className="inline-flex items-center gap-1.5 border border-line rounded-lg px-3 py-1.5 text-ink hover:bg-paper-deep transition-colors"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <span data-testid="nav-cart-label">{t('nav.bag')}</span>
            <span aria-hidden="true" className="text-ink-faint">·</span>
            <span
              data-testid="cart-count"
              className={`inline-block min-w-3 text-center text-ink font-semibold tabular-nums transition-transform ${pulse ? 'animate-pulse-once' : ''}`}
            >
              {cartCount}
            </span>
          </Link>
          {token ? (
            <>
              <Link
                href="/wishlist"
                data-testid="nav-wishlist"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep transition-colors"
              >
                {t('nav.wishlist')}
              </Link>
              <Link
                href="/orders"
                data-testid="nav-orders"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep transition-colors"
              >
                {t('nav.orders')}
              </Link>
              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin/products"
                    data-testid="nav-admin"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-clay-600 font-medium hover:bg-paper-deep transition-colors"
                  >
                    {t('nav.admin')}
                  </Link>
                  <Link
                    href="/admin/metrics"
                    data-testid="nav-admin-metrics"
                    className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-clay-600 hover:bg-paper-deep transition-colors"
                  >
                    Metrics
                  </Link>
                </>
              )}
              <button
                onClick={clear}
                data-testid="nav-signout"
                title={user?.email}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg text-ink-soft hover:bg-paper-deep transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-clay-500 text-card text-xs font-semibold flex items-center justify-center">
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
              className="inline-flex items-center px-4 py-2 rounded-lg bg-clay-500 text-card font-medium hover:bg-clay-600 transition-colors active:scale-95"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
