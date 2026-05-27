# Phase 3 — Frontend Storefront (SUT)

**Objective:** A minimal Next.js storefront covering the user-facing flows.

**Build:**
- `apps/web` (Next.js 15, App Router) talking to the API via a typed fetch wrapper (`apps/web/lib/api.ts`).
- **Styling:** Tailwind CSS 4 — utility classes only, no component library. One shared layout, neutral palette, responsive grid. Function over polish.
- **State:** auth token + cart count in a lightweight React context, hydrated from `localStorage`; cart/order data fetched from the API (no client-side cache lib needed). Tests inject the token into `localStorage` to skip the login UI walk.
- Stable, test-friendly selectors (`data-testid`) on every key interactive element (see map below).

**Routes (App Router):**

| Route | Page | Purpose |
|---|---|---|
| `/` | Product list | grid of products, add-to-cart |
| `/products/[id]` | Product detail | single product, stock, add-to-cart |
| `/cart` | Cart | line items, quantities, subtotal, go-to-checkout |
| `/checkout` | Checkout | confirm + place order |
| `/orders` | Order history | list of the user's orders + status |
| `/orders/[id]` | Order confirmation/detail | order id, items, status badge |
| `/login` | Auth | register / login, persists token |

**Components:** `Navbar` (nav links + cart count), `ProductCard`, `ProductGrid`, `CartTable`, `CheckoutForm`, `OrderSummary`, `OrderStatusBadge`, `AuthForm`, `Toast` (errors).

**`data-testid` map (key elements):**

| Element | `data-testid` |
|---|---|
| Product card | `product-card-{id}` |
| Add-to-cart button | `add-to-cart-{id}` |
| Cart count badge | `cart-count` |
| Cart line item | `cart-item-{id}` |
| Remove-from-cart button | `cart-remove-{id}` |
| Cart subtotal | `cart-subtotal` |
| Proceed-to-checkout button | `cart-checkout` |
| Place-order button | `checkout-submit` |
| Order id (confirmation) | `order-id` |
| Order status badge | `order-status` |
| Nav links | `nav-products`, `nav-cart`, `nav-orders` |
| Auth fields / submit | `auth-email`, `auth-password`, `auth-submit` |
| Error toast | `toast-error` |

**Definition of Done:** A human can complete browse → cart → checkout → confirmation in the browser end to end.

**Checkpoint:** Report routes + the `data-testid` map for key elements. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: `next build` succeeds (8 routes), API + web run side-by-side (`:3001` + `:3000`), all routes serve a valid HTML shell with the expected `data-testid` selectors. `pnpm lint` + `pnpm typecheck` both 7/7 green.

### As built

- **Next.js 15 + React 19, App Router** under `apps/web/app/`. All pages are client components (`'use client'`) — auth state lives in `localStorage` so the server can't render protected content anyway, and tests can inject the token before page load.
- **Tailwind CSS 4** zero-config (no `tailwind.config.js`): `app/globals.css` has `@import 'tailwindcss';`, `postcss.config.mjs` wires `@tailwindcss/postcss`. Utility classes only.
- **`lib/api.ts`** — typed fetch wrapper. One `request<T>()` core; inline `Product`/`Cart`/`Order`/`AuthResult` types matching the API. `cache: 'no-store'` so Next never caches dynamic data. `ApiError` carries status. Phase 4 swaps these inline types for `@qa/contracts` Zod schemas.
- **`lib/auth.tsx`** — React context. Persists `qa_token` + `qa_user` in `localStorage` (exported as `TOKEN_KEY`/`USER_KEY` for tests to inject). `refreshCartCount()` hits `/cart` and aggregates `Σ quantity` for the navbar badge.
- **Components:** `Navbar`, `ProductCard`, `CartTable`, `AuthForm`, `Toast`, `OrderStatusBadge`, `OrderSummary`. Each interactive element has a `data-testid` from the map.
- **Auth redirect pattern:** protected pages (`/cart`, `/checkout`, `/orders`, `/orders/[id]`) call `router.push('/login')` in `useEffect` when no token.
- **Env:** `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) read at build time + runtime. Loaded from root `.env` via `dotenv-cli` in the dev/build/start scripts. Default fallback in `lib/api.ts` keeps the dev script usable even without `.env`.
- **Scripts:** `dev` = `next dev -p 3000`, `build` = `next build --no-lint` (we lint via the root `pnpm lint`), `start` = `next start -p 3000`.

### Verification

- `pnpm --filter @qa/web build` — all 8 routes compiled (○ static for `/`, `/cart`, `/checkout`, `/login`, `/orders`, `/_not-found`; ƒ dynamic for `/products/[id]` and `/orders/[id]`).
- With both servers up: `curl` against `/`, `/login`, `/cart`, `/checkout`, `/orders`, `/products/prod_widget`, `/orders/abc` returned HTML with `nav-products`, `nav-cart`, `cart-count`, `auth-email`, `auth-password`, `auth-submit`, and `checkout-submit` all present. Dynamic IDs (`product-card-*`, `cart-item-*`, `order-id`, etc.) attach after client hydration + fetch — Phase 4 Playwright exercises that path.

### Carry-over for Phase 4

- Tests should set `localStorage.setItem('qa_token', token)` + `localStorage.setItem('qa_user', JSON.stringify(user))` before page load. Keys exported from `lib/auth.tsx`.
- Inline API types in `lib/api.ts` will be replaced by `@qa/contracts` Zod schemas (their inferred types).
- `next-env.d.ts` is now in the base ESLint ignore list — Next regenerates it on every build with a triple-slash reference we can't control.
