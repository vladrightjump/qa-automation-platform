'use client';

// English-only microcopy + USD formatter. Replaced the multi-locale provider
// during the portfolio trim — no cookies, no message catalogs, no Locale type
// — but the call sites (`useLocale().t(...)`, `useLocale().formatMoney(...)`)
// stay unchanged so components don't churn.
import { createContext, useContext, type ReactNode } from 'react';

const MESSAGES: Record<string, string> = {
  'nav.bag': 'Bag',
  'nav.orders': 'Orders',
  'nav.admin': 'Admin',
  'nav.signIn': 'Sign in',
  'nav.signOut': 'Sign out',
  'product.lowStock': 'Low stock',
  'product.soldOut': 'Sold out',
  'product.outOfStock': 'Out of stock',
  'product.adding': 'Adding…',
  'product.addToCart': 'Add to cart',
  'cart.item': 'Item',
  'cart.qty': 'Qty',
  'cart.subtotal': 'Subtotal',
  'checkout.total': 'Total',
};

function translate(key: string, vars?: Record<string, string | number>): string {
  const template = MESSAGES[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

function formatMoneyUsd(priceCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100);
}

interface LocaleContextValue {
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoney: (priceCents: number) => string;
  currency: 'USD';
}

const VALUE: LocaleContextValue = {
  t: translate,
  formatMoney: formatMoneyUsd,
  currency: 'USD',
};

const LocaleContext = createContext<LocaleContextValue>(VALUE);

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <LocaleContext.Provider value={VALUE}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
