'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { token, user, cartCount, clear } = useAuth();
  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <Link
          href="/"
          data-testid="nav-products"
          className="font-semibold text-gray-900"
        >
          QA Storefront
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/cart" data-testid="nav-cart" className="text-gray-700">
            Cart
            <span
              data-testid="cart-count"
              className="ml-1 inline-block min-w-5 text-center bg-blue-600 text-white text-xs rounded-full px-2 py-0.5"
            >
              {cartCount}
            </span>
          </Link>
          {token ? (
            <>
              <Link
                href="/orders"
                data-testid="nav-orders"
                className="text-gray-700"
              >
                Orders
              </Link>
              <button
                onClick={clear}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign out ({user?.email})
              </button>
            </>
          ) : (
            <Link href="/login" className="text-blue-600">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
