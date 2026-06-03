# Testing conventions — assertions, tags & the sanity suite

> Companion to [`README.md`](./README.md) (the framework tour). This file is the
> **rulebook**: how we assert, how we tag, and what the `@sanity` suite is.

---

## 1. Assertion conventions

The suite is **web-first only**. Assertions auto-wait and auto-retry; never poll
the DOM by hand or assert on a one-shot boolean.

**Do**

- `await expect(locator).toBeVisible()` / `toHaveText()` / `toHaveValue()` / `toBeEnabled()` — always `await`.
- `await expect(page).toHaveURL(/…/)` for navigation.
- `await expect.poll(() => db.<model>.count(…)).toBe(n)` for **async side-effects** (audit logs, stock, redemptions) — never `waitForTimeout`.
- `await expect.soft(…)` to group several related checks so one failure doesn't hide the others.
- Custom matchers (see [`support/matchers.ts`](./support/matchers.ts)):
  - `expect(page).toHaveCartCount(n)` — retries the navbar badge.
  - `expect(body).toMatchContract(ZodSchema)` — validates an API/response shape.
  - `expect(page).toBeAccessible({ … })` — axe-core scan with an impact threshold.
- Use a **web-first assertion as the readiness gate** before reading a value:
  `await expect(card).toBeVisible()` rather than `await card.waitFor()`.

**Don't**

- ❌ `expect(await locator.isVisible()).toBe(true)` — use `toBeVisible()`.
- ❌ `expect(locator).toBeTruthy()` — meaningless on a locator.
- ❌ `expect(…)` without `await` on async matchers.
- ❌ `page.waitForTimeout(…)` as a sync crutch — assert on the real condition.
- ❌ branching on `await locator.count()` to pick a test path when the state can
  be made deterministic (e.g. `AdminProductsPage.revealRow()` pages to the row).

**Allowed `waitFor()`** — only as a readiness gate inside a Page Object where
there's no value to assert yet, e.g. `modal().waitFor({ state: 'detached' })`
to confirm a dialog closed, or waiting for render before a visual screenshot.

---

## 2. Tag taxonomy

Tags use Playwright's **native annotation** (not text in the title):

```ts
test('complete flow → confirmation + DB row', {
  tag: ['@smoke', '@checkout', '@sanity'],
}, async ({ … }) => { … });
```

`--grep` matches against tags, so `playwright test --grep @cart` works, and the
`playwright.config.ts` project greps (`webkit` → `@smoke`, `chromium-mobile` →
`@smoke|@mobile`) are unaffected.

Every e2e test carries **one kind tag** + **one or more feature tags**; one test
per feature also carries `@sanity`.

| Kind tag | Meaning |
|----------|---------|
| `@smoke` | Critical happy path; runs on PRs and cross-browser. |
| `@regression` | Fuller happy + unhappy coverage; full suite on `main`. |
| `@a11y` | axe-core / ARIA-contract checks. |
| `@network` | `page.route` mocking / resilience scenarios. |
| `@mobile` | Phone form factor (runs in `chromium-mobile` + `webkit-mobile`). |
| `@tablet` | Tablet form factor (runs in `tablet-ipad` + `tablet-android`). |

| Feature tag | Area |
|-------------|------|
| `@auth` | Sign-in / session / guarded routes |
| `@catalog` | Browse, search, filter, sort, quick-view, recently-viewed |
| `@cart` | Cart items, quantity, remove |
| `@checkout` | 3-step wizard, payment, validation |
| `@orders` | Order list, detail, confirmation, cancel |
| `@reviews` | Product reviews |
| `@wishlist` | Wishlist |
| `@addresses` | Saved addresses |
| `@admin` | Admin product CRUD |
| `@admin-orders` | Admin order management: fulfilment + return decisions |
| `@promo` | Promo codes + discovery |
| `@returns` | Order returns / RMA request flow |
| `@stock-alert` | Back-in-stock "notify me" subscriptions |
| `@loyalty` | Loyalty points / store credit (earn + redeem) |
| `@i18n` | Locale switcher, translated strings, `formatMoney` |
| `@geo` | `GET /geo/resolve` + `/geo/regions`, `PATCH /me/locale`, GeoBanner |
| `@search` | Full-text search + autocomplete (`GET /products/search`, `/products/suggestions`) |
| `@cache` | `X-Cache: hit/miss/bypass` header contract + admin-mutation invalidation |
| `@recommendations` | `GET /recommendations` (collaborative + same-category + recently-viewed) + carousel |

> **Note:** every spec — `tests/api/*` and `tests/e2e/*` — now uses native
> Playwright `tag: [...]` arrays carrying the `@smoke`/`@regression` tier plus a
> feature tag, so `--grep @<feature>` selects across both layers (e.g.
> `test:feature @loyalty` includes `tests/api/loyalty.api.spec.ts`).

---

## 3. The `@sanity` suite

`@sanity` marks **exactly one** critical happy-path test **per feature** — a
fast, broad, deterministic gate that proves every feature still works end-to-end.

Rules:

- One `@sanity` test per feature, no more. It must be the single most
  representative happy path.
- Keep it fast and deterministic — no reliance on accumulated parallel state.
- It is the **pre-deploy / PR gate**: CI runs `@sanity` first (fail-fast) before
  the heavier sharded suite (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

Current `@sanity` set (one per feature): `@auth`, `@catalog`, `@cart`,
`@checkout`, `@orders`, `@reviews`, `@wishlist`, `@addresses`, `@admin`, `@promo`,
`@returns`, `@admin-orders`, `@stock-alert`, `@loyalty`, `@i18n`, `@geo`, `@search`,
`@recommendations`.

---

## 4. How to run

```bash
pnpm --filter @qa/tests test:sanity        # the one-per-feature gate
pnpm --filter @qa/tests test:smoke         # all @smoke
pnpm --filter @qa/tests test:regression    # all @regression
pnpm --filter @qa/tests test:a11y          # all @a11y
pnpm --filter @qa/tests test:feature @cart # any feature (passes through to --grep)
pnpm --filter @qa/tests test:mobile        # chromium-mobile + webkit-mobile
pnpm --filter @qa/tests test:tablet        # tablet-ipad + tablet-android
pnpm --filter @qa/tests test:visual        # storefront + tablet visual baselines
pnpm --filter @qa/tests test               # full suite (chromium-desktop)
```

---

## 5. POM, fixtures & factories (quick reference)

- **Page Objects** — [`pages/*.page.ts`](./pages). Locators favour
  `getByRole`/`getByLabel`/`getByPlaceholder`; `data-testid` only for dynamic
  ids/containers. Methods encapsulate multi-step flows and modal lifecycles.
- **Fixtures** — [`fixtures/index.ts`](./fixtures/index.ts). `db` (worker-scoped
  Prisma), `api` (Zod-validating client), `testUser`/`adminUser`,
  `authedPage`/`adminPage` (inject auth into `page` — **destructure them or the
  page is unauthenticated**), and one fixture per Page Object.
- **Factories** — [`factories/*.factory.ts`](./factories). Faker-backed builders
  for unique, isolated test data.
