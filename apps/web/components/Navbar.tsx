'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { token, user, cartCount, clear } = useAuth();
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
    <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <Link
          href="/"
          data-testid="nav-products"
          className="flex items-center gap-2 font-bold text-gray-900 text-base group"
        >
          <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white text-sm shadow-sm group-hover:scale-105 transition-transform">
            Q
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-400 ring-2 ring-white" />
          </span>
          <span className="tracking-tight">QA Storefront</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
          <Link
            href="/cart"
            data-testid="nav-cart"
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <span aria-hidden="true">🛒</span>
            <span className="hidden sm:inline">Cart</span>
            <span
              data-testid="cart-count"
              className={`inline-block min-w-5 text-center bg-brand-600 text-white text-xs rounded-full px-2 py-0.5 font-semibold transition-transform ${pulse ? 'animate-pulse-once' : ''}`}
            >
              {cartCount}
            </span>
          </Link>
          {token ? (
            <>
              <Link
                href="/wishlist"
                data-testid="nav-wishlist"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Wishlist
              </Link>
              <Link
                href="/orders"
                data-testid="nav-orders"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Orders
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/products"
                  data-testid="nav-admin"
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-colors"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={clear}
                data-testid="nav-signout"
                title={user?.email}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white text-xs font-bold flex items-center justify-center">
                  {(user?.email?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="hidden md:inline text-xs text-gray-500">
                  Sign out
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors active:scale-95"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
