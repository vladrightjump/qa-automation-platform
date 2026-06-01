# Phase 11 — Refactor: shared web UI primitives + hooks

> **Type:** Behaviour-preserving refactor. Markup is consolidated, not
> redesigned. Every `data-testid`, label, `aria-*`, and visible string is
> preserved verbatim so the suite stays green without edits.

**Problem / motivation:** the storefront accumulated copy-paste the redesign
made obvious:
- **No `Button` primitive** — clay/outline/ghost button markup is hand-rolled
  with near-identical Tailwind strings in **15** files; a tweak to button style
  means 15 edits.
- **`CATEGORY_HUE` + `initials()` duplicated in 4 components** (`ProductCard`,
  `QuickViewModal`, `RecentlyViewed`, `RelatedProducts`) — they already drifted
  once during the redesign (had to fix the warm duotones in every copy).
- **Auth-guard effect repeated across 8 pages** — the same
  `if (!isHydrated) return; if (!token) router.push('/login')` `useEffect`.

**Objective:** Single definitions for the button, the product-visual helpers,
and the auth guard, adopted everywhere, with zero behavioural change.

---

## Build

**Button primitive** (`apps/web/components/ui/Button.tsx`):
- Props: `variant` (`primary` clay / `secondary` outline / `ghost` / `danger`),
  `size` (`sm`/`md`), `as` (`button` | anchor via `Link`), plus `...rest` so
  `data-testid`, `disabled`, `onClick`, `type`, `href` pass through.
- Encapsulate the shared classes (`rounded-full`, active-scale, disabled state,
  transitions). Adopt in `ProductCard`, `Hero`, `Navbar`, checkout, cart, order
  detail, wishlist, addresses, admin pages — **carrying over each existing
  `data-testid` and label unchanged**.

**Product visual helper** (`apps/web/lib/product-visual.ts`):
- Export the single warm `CATEGORY_HUE` map + `initials(name)`; import in the
  four components above and delete their local copies.

**Auth-guard hook** (`apps/web/lib/use-require-auth.ts`):
- `useRequireAuth()` → returns `{ token, user, isHydrated }` and performs the
  hydrate-aware redirect to `/login`. Replace the duplicated effect in the 8
  authed pages (`cart`, `checkout`, `orders`, `orders/[id]`, `wishlist`,
  `account/addresses`, `admin/products`, `admin/orders`). Preserve admin's
  extra `role !== 'ADMIN'` redirect (pass an `requireAdmin` option).

**Stretch (optional):** `ui/Field.tsx` wrapping the repeated
label + input + inline-error markup in checkout / addresses / `AuthForm`.

---

## Definition of Done

- `Button`, `product-visual`, and `use-require-auth` are the single definitions;
  no duplicate `CATEGORY_HUE`/`initials`; no inline auth-guard effects remain.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` green.
- Full `@sanity` + storefront/admin e2e green with **no spec edits** and no
  `data-testid` changes; `test:update-snapshots` not required (visuals identical).

## Status — ✅ Done (Button adopted as a safe subset)

- **`lib/product-visual.ts`** — single `CATEGORY_HUE` + `initials()` + a small
  `categoryGradient()` helper (encapsulates the `?? 'from-gray-300…'` fallback).
  Local copies deleted from `ProductCard`, `QuickViewModal`, `RecentlyViewed`,
  `RelatedProducts`.
- **`lib/use-require-auth.ts`** — `useRequireAuth({ requireAdmin })` returns the
  full auth value and owns the hydrate-aware `/login` redirect (and the admin
  `→ '/'` redirect). Adopted in all 8 protected pages; the inline guard effects
  are gone and each page's data-loading effect keeps only its `if (!token)
  return` fetch guard. Standardised on `router.replace` (admin pages previously
  used `window.location.replace` — soft nav, same destination; the
  redirect-away e2e only asserts the pathname left `/admin/products`). Dropped
  admin/products' inconsistent "Admin role required." toast (only one of the two
  admin pages had it; not test-observed).
- **`components/ui/Button.tsx`** — `primary`/`secondary`/`ghost`/`danger` ×
  `sm`/`md`, polymorphic `as="button" | "link"`, passthrough of
  `data-testid`/`disabled`/`onClick`/`type`/`href`. **Adopted only on the
  redesigned pill pages** (orders/[id], wishlist, checkout nav, cart CTAs),
  carrying every `data-testid` and label verbatim. **Deliberately skipped**
  (per the chosen "no visual risk" scope): Hero/ProductCard/Navbar/AuthForm
  (home & login are the only visually-snapshotted pages), and the
  plain/legacy-styled `bg-blue-600`/square buttons on addresses, admin/* and the
  CartTable delete modal — converting those would visibly restyle them. Bespoke
  amber/red-outline buttons left as-is (no matching variant).
- Gates: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm --filter @qa/web build`
  green. Full Playwright run: **231 passed**, visual baseline (home/login)
  unchanged, no spec or `data-testid` edits. The 4 failures are all
  **pre-existing** (reproduce on the phase-10 baseline) and confined to
  non-primary projects: 3 `chromium-mobile` nav-hidden specs + 1 flaky
  webkit/mobile wishlist-toggle.

### Remaining (optional follow-up)
- Introduce `secondary`-outline + `danger`-outline and a plain/legacy size so
  the addresses / admin / CartTable-modal buttons and the bespoke amber/red
  buttons can also adopt `Button` without restyling. Then adopt on
  Hero/ProductCard/Navbar/AuthForm with a visual-snapshot refresh.
- `ui/Field.tsx` (stretch) not done.

## Follow-ups (out of scope)

- Extract `Card`, `Badge`, `Table` primitives (admin tables duplicate scaffold).
- A `useResource(fetcher)` hook for the repeated load/`useState`/error pattern.
