# Phase E — Pyramid base (Vitest only, narrowly scoped)

> Fill the missing unit-test base on the components and services that
> have **real logic**. Skip CRUD-shape code where a unit test would
> just mirror mocks. This is the only phase that adds dependencies,
> and they're standard test-runner deps — not new test layers.
>
> Time-box: one PR for `apps/web`, one PR for `apps/api`.

---

## Why

The platform claims a test pyramid but its base is empty. `apps/api`
has zero `.test.ts` / `.spec.ts`. `apps/web` has zero. The
transactional service layer (`orders`, `promo`, `geo`) and the React
state machines (`AuthProvider`, `LocaleProvider`, `GeoBanner`) are
only verified by Playwright — the slowest possible feedback loop.

This is also a prerequisite for Phase F: Stryker can't mutate service
code without a fast verifier suite.

Narrowly scoped on purpose. Most controllers / pages / CRUD services
have no logic worth unit-testing; adding tests there inflates the
suite without adding signal.

---

## What

### E.1 `apps/web` — Vitest + React Testing Library on 3 components

- `apps/web/vitest.config.ts` — `environment: 'jsdom'`,
  `setupFiles: ['./vitest.setup.ts']`, workspace alias.
- `apps/web/vitest.setup.ts` — `import '@testing-library/jest-dom/vitest'`.
- `apps/web/lib/auth.test.tsx` — `AuthProvider`:
  - Initial state: `isHydrated=false`, `token=null`.
  - After mount: reads `localStorage[TOKEN_KEY]` + `[USER_KEY]`,
    sets state, flips `isHydrated=true`.
  - `logout()` clears both storage keys and resets state.
  - Storage write round-trip: setting token via the context API
    writes to localStorage.
- `apps/web/lib/i18n.test.tsx` — `LocaleProvider`:
  - Locale change updates context.
  - `formatMoney` falls back to USD when locale unsupported (or
    however the implementation handles it — assert the actual
    contract).
  - Message catalog lookup with missing key returns the key (or
    fallback) — assert the actual implementation, do not invent.
- `apps/web/components/GeoBanner.test.tsx`:
  - Renders nothing when dismissed (storage flag set).
  - Renders banner when `region.locale !== user.preferredLocale`.
  - "Accept" click invokes the handler with the suggested locale.
  - "Dismiss" sets the storage flag and re-mounts → not rendered.

**Deps to add to `apps/web/package.json`:**
- `vitest`, `@vitest/coverage-v8`
- `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`
- `jsdom`

---

### E.2 `apps/api` — Vitest on 3 services

- `apps/api/vitest.config.ts` — `environment: 'node'`, workspace alias.
- For each service: a `<feature>.service.test.ts` next to the source.
- Use `vitest-mock-extended` to mock `PrismaClient`.

Files:

- `apps/api/src/orders/orders.service.test.ts`:
  - `computeTotal` math (multiple line items, discount applied,
    loyalty redemption capped).
  - Stock guard: throws when any item exceeds stock.
  - Promo apply branch: when promo matches, total drops; when
    expired, error path taken (mocked prisma returns expired promo
    row).
  - Loyalty redemption: positive points reduce total; negative
    rejected; over-balance rejected.
- `apps/api/src/promo/promo.service.test.ts`:
  - Cap enforcement (mock `timesRedeemed = maxRedemptions` →
    redemption rejected).
  - Expiry check (mock `expiresAt` past).
  - Mutual exclusivity of `percentOff` and `flatOffCents`.
- `apps/api/src/geo/geo.service.test.ts`:
  - Nearest-region by haversine with 4 hand-computed cases (mocked
    `region.findMany`).
  - Out-of-range lat/lng → validation error.

**Deps to add to `apps/api/package.json`:**
- `vitest`, `@vitest/coverage-v8`
- `vitest-mock-extended`

---

### E.3 Wiring

- `apps/web/package.json` `scripts.test:unit`: `vitest run`.
- `apps/api/package.json` `scripts.test:unit`: `vitest run`.
- `turbo.json` — add `test:unit` pipeline so root `pnpm test:unit`
  picks up `@qa/web`, `@qa/api`, and the existing `@qa/contracts` /
  `@qa/db` Vitest suites in one command.
- `.github/workflows/ci.yml` — add a `unit` job that runs
  `pnpm test:unit` *before* the existing lint/build/test pipeline
  (fail-fast).

---

## Acceptance

- `pnpm --filter @qa/web test:unit` runs in <5 s.
- `pnpm --filter @qa/api test:unit` runs in <10 s.
- ≥ 80 % statement coverage on the 6 listed files (V8 coverage).
- Root `pnpm test:unit` runs all unit suites in one command.
- New CI `unit` job runs in <30 s and gates PRs.
- Existing E2E suite unchanged.

## Scope guard

- **Three components, three services. No more.** If the temptation is
  "well, while I'm here, let me also unit-test ProductCard / cart.service /
  search.service" — resist. CRUD-shape code adds no mutation signal.
- **No Nest test harness** (`Test.createTestingModule`). Test the
  service class as plain TS. DI wiring is verified end-to-end.
- **No real Prisma client** in the unit suite — use
  `vitest-mock-extended`. The integration / E2E layer covers the real
  client.
- **No MSW.** None of the listed components do real network calls;
  they call context handlers. If a component test would need MSW, it
  belongs in E2E.
- Coverage targets are floors, not goals. Don't pad with trivial tests
  to hit 100 %.

## Dependencies

None. Phase F depends on this; everything else is independent.

## Out of scope (deliberately)

- Playwright Component Testing — Vitest + RTL covers the same logic
  at lower setup cost. PCT is reserved for components with real DOM
  / styling concerns these three don't have.
- Storybook — adds infra, no test signal.
- React 19 Server Component testing — `lib/auth.tsx` and
  `lib/i18n.tsx` are client components; RTL handles them. Server
  components stay covered by Playwright E2E.
- Adding Vitest to `apps/api/src/controllers/*` — controllers in this
  codebase are thin DI shells; mutation/unit signal lives in services.

## Status — ✅ Built (E.1 + E.2, one commit per app)

- **E.1 `apps/web`** (`bc34df4`) — Vitest 4 + `@vitejs/plugin-react@6` (Vite 8 compatible) + jsdom + jest-dom + RTL + user-event. Three test files: `lib/auth.test.tsx` (7 tests · 100 % lines), `lib/i18n.test.tsx` (10 tests · 96 % lines), `components/GeoBanner.test.tsx` (7 tests · 92 % lines on a mocked-geolocation state machine).
- **E.2 `apps/api`** (`5323fd5`) — Vitest 4 + `vitest-mock-extended` for a deep-mocked `PrismaClient`. Three test files: `src/geo/geo.service.test.ts` (originally 7, later 9 after Phase F's haversine boundary additions), `src/orders/promo.service.test.ts` (originally 13, later 14), `src/orders/orders.service.test.ts` (originally 16, later 23). `apps/api/tsconfig.json` now excludes `*.test.ts` from the build (top-level `await import()` is incompatible with the commonjs target).

Root `pnpm test:unit` now runs 179 unit/property tests across four packages (contracts 79 · db 30 · web 24 · api 46). All under 1 s cold; the api suite alone is ~250 ms. Both web and api unit suites participate in the CI `unit` job via the existing `turbo run test:unit` pipeline — no workflow changes were needed.
