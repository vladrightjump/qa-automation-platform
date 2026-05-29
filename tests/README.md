# `@qa/tests` — Playwright framework guide

> **Audience:** anyone reading this as a portfolio piece, or anyone joining the project and writing a new spec. If you only want to *run* tests, jump to **Running**. If you want to know *why* the framework looks like it does, read top to bottom.

The suite drives the SUT (NestJS API + Next.js storefront in this repo) through three distinct layers — API, DB, and UI — and demonstrates the breadth of Playwright + modern test-engineering patterns. It does this without sacrificing speed or readability.

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [The framework, layer by layer](#2-the-framework-layer-by-layer)
3. [Decisions & trade-offs (why this, not that)](#3-decisions--trade-offs)
4. [Writing a new spec — recipe](#4-writing-a-new-spec--recipe)
5. [Running tests](#5-running-tests)
6. [CI shape](#6-ci-shape)
7. [Glossary of files](#7-glossary-of-files)

---

## 1. Mental model

A test request flows through **two orthogonal axes**:

```
Axis 1 — WHAT it tests:           Axis 2 — HOW it sets up state:
  ┌─────────────┐                   ┌─────────────────────┐
  │ API (HTTP)  │                   │ db.<model>.create() │  ← fast, direct
  ├─────────────┤                   ├─────────────────────┤
  │ DB (Prisma) │                   │ api.<method>(token) │  ← exercises auth
  ├─────────────┤                   ├─────────────────────┤
  │ UI (browser)│                   │ page.route(...)     │  ← mock the network
  └─────────────┘                   └─────────────────────┘
```

A given spec picks one row of axis 1 + one or more rows of axis 2. The fixtures (§2.2) make the chosen combination ergonomic.

Most teams skip axis 2 entirely and let the UI walk every setup step. That's slow and brittle. Here, **the cheapest possible setup runs first**, and the UI only drives the bit that's actually under test.

---

## 2. The framework, layer by layer

### 2.1 Page Objects (`tests/pages/`)

One class per route. Each method is **intent-revealing** — `cart.removeItem(productId)` not `page.click('#btn-remove-xxx')`.

The selector strategy is deliberately mixed:

```ts
// Visible action buttons → role + name
this.page.getByRole('button', { name: 'Next' })

// Form fields with visible labels → label
dialog.getByLabel('Full name')

// Inputs without a label → placeholder
this.page.getByPlaceholder('WELCOME10')

// Chained locators when the same name appears in multiple places
this.productCard(id).getByRole('button', { name: /add to cart|out of stock/i })

// Dynamic-id containers (no stable accessible name) → testid
this.page.getByTestId(`cart-item-${productId}`)
```

This isn't just style — every selector that **fails** because there's no accessible name is also an a11y bug. The PO acts as a passive a11y audit.

### 2.2 Fixtures (`tests/fixtures/index.ts`)

Specs request only the fixtures they need; unused ones never run.

| Fixture | Scope | What it gives you |
|---|---|---|
| `db` | worker | Singleton Prisma client. Same instance the API uses, so writes are immediately visible. |
| `api` | test | Typed HTTP wrapper that runs every response through a Zod schema. Drift fails here with a clear message. |
| `testUser` | test | A freshly-registered user with a unique email. Test owns this user's state. |
| `adminUser` | test | Login against the seeded admin account. Shared by design. |
| `authedPage` | test | The shared `page` mutated by an `addInitScript` that pre-fills the testUser's token into localStorage. **Skips the login UI walk.** |
| `adminPage` | test | Same, for the admin. |
| `storefront` / `cart` / `checkout` / `addresses` / `adminProducts` | test | Each PO is exposed as a fixture so specs just destructure it. No `new XPage(...)` ceremony anywhere. |

**Auth is orthogonal to POs**: a public-flow spec destructures just the PO; an authed-flow spec also destructures `authedPage` for its setup side-effect.

### 2.3 Setup project + storageState (`tests/setup/auth.setup.ts`)

A Playwright **setup project** runs once before any test project and produces `tests/.auth/{user,admin}.json` (gitignored). Downstream projects can consume it via `storageState: 'tests/.auth/user.json'`.

```
┌─────────┐   produces   ┌──────────────────┐   reads   ┌────────┐
│  setup  │ ────────────▶│ tests/.auth/*.json│◀──────────│ visual │
└─────────┘              └──────────────────┘           └────────┘
                                   ▲
                                   │ (also available to any project
                                   │  that opts in with `test.use(...)`)
```

We use storageState **only for the `visual` project** and any spec that explicitly opts in. The default `chromium-desktop` project keeps per-test fixtures because they give isolation between parallel tests. Both patterns coexist — pick the one that matches your test's mutation profile.

### 2.4 Custom expect matchers (`tests/support/matchers.ts`)

Registered via `expect.extend`, available everywhere `expect` is imported.

| Matcher | Signature | When |
|---|---|---|
| `toHaveCartCount(n)` | `expect(page).toHaveCartCount(2)` | Reads the navbar badge. Auto-retries — composes with web-first timing. |
| `toMatchContract(schema)` | `expect(data).toMatchContract(SomeSchema)` | Zod-parses the value; failure surfaces a path-aware list of issues. Great for asserting API responses. |
| `toBeAccessible(opts)` | `await expect(page).toBeAccessible()` | Wraps `@axe-core/playwright`; configurable impact threshold, optional rule allow-list. |

### 2.5 Smart waits & structured assertions

The smoke checkout flow shows the patterns in one place:

```ts
await test.step('seed: default address + fresh product', async () => { ... });
await test.step('add product to cart from the detail page', async () => {
  ...
  await expect(authedPage).toHaveCartCount(1);     // custom matcher
});
...
await expect
  .poll(() => db.auditLog.count({ where: { ... } }))  // wait for side-effect
  .toBe(1);

// Surface ALL three failures at once if state drifts
await expect.soft(cart.item(a.id)).toBeVisible();
await expect.soft(cart.item(b.id)).toBeVisible();
await expect.soft(cart.subtotal()).toHaveText(/\$30\.00/);
```

For network-driven UI updates, `page.waitForResponse` is preferred over DOM polling:

```ts
const [response] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/products?q=Thingamajig')),
  storefront.search('Thingamajig'),
]);
expect(response.ok()).toBe(true);
```

This asserts the **network event**, not a DOM proxy for it.

### 2.6 Network mocking (`tests/e2e/network-mocking.e2e.spec.ts`)

`page.route` intercepts API calls *before* they leave the browser. Five scenarios covered:

- **500 server error** on `POST /cart/items` → cart count stays at 0.
- **401 auth expiry** on `GET /cart` → client redirects to `/login`.
- **Slow network** on `GET /products?*` → loading state is observable.
- **Contract drift** (synthetic) → `toMatchContract` surfaces the violation list.
- **waitForResponse** (positive control) → asserts the real /products call fires when the search input debounces.

### 2.7 Accessibility scans (`tests/e2e/a11y.e2e.spec.ts`)

`AxeBuilder(page).analyze()` against every major route, wrapped in the `toBeAccessible` matcher. Tagged `@a11y @regression` so they run as part of the regular suite *and* are addressable via `pnpm test:a11y`.

The default impact threshold is `serious`. To accept a known pre-existing violation, allow-list its rule id with a comment justifying it:

```ts
await expect(page).toBeAccessible({
  disableRules: ['color-contrast'], // Tailwind defaults; not the user's job to fix in this pass.
});
```

### 2.8 Visual regression (`tests/e2e/*.visual.spec.ts`)

`expect(page).toHaveScreenshot('name.png', { mask: [...] })` against committed baselines under `tests/e2e/*-snapshots/`.

Only runs in the dedicated `visual` project so screenshots don't tag along with every shard. Update baselines deliberately with `pnpm test:update-snapshots`.

Dynamic regions (the toast queue, factory-generated product cards) are **masked** so the diff is about the deterministic UI parts.

### 2.9 Multi-project config (`tests/playwright.config.ts`)

```
┌─────────┐                       ┌─────────────────┐
│  setup  │ ◀── dependencies ──── │ chromium-desktop │ ← default, full suite
└─────────┘                       ├─────────────────┤
     ▲                            │ chromium-mobile │ ← @smoke|@mobile, Pixel 5
     │                            ├─────────────────┤
     │                            │     webkit      │ ← @smoke, Safari
     │                            ├─────────────────┤
     └────────────────────────────│     visual      │ ← *.visual.spec.ts only
                                  └─────────────────┘
```

Each downstream project declares `dependencies: ['setup']` so the setup project runs first automatically — no manual ordering needed.

### 2.10 Reporters

```ts
[
  ['html'],                                   // local + uploaded on CI failure
  ['list'],                                   // human-readable stdout
  ['junit', { outputFile: ... }],             // CI consumption
  ['github']                                  // CI-only, PR annotations
]
```

---

## 3. Decisions & trade-offs

### 3.1 Per-test users *and* storageState

Choosing one would have been simpler. We deliberately demo both:
- **Per-test user (default)** → strong isolation; specs mutate freely (cart, orders, wishlist) without trampling each other.
- **Shared storageState (visual + future shared specs)** → no register/login per test, snapshots land on a stable page.

The first is correct most of the time. The second is correct for read-only flows.

### 3.2 `data-testid` retained for dynamic-id containers

The user-facing-selectors-first pattern doesn't mean *no* testids. A row container with `data-testid="cart-item-prod_abc123"` has no accessible name that ties it to the productId — the testid IS the accessible reference. Removing it would force tests to nth-child their way around, which is exactly the brittleness the pattern is supposed to avoid.

### 3.3 Custom matchers over inline helpers

`toHaveCartCount(2)` and a helper `expectCartCount(page, 2)` look similar from the call site, but the matcher path gives us:
- Auto-retry semantics via `expect.poll` integration.
- A consistent failure message in the HTML report.
- Auto-completion at the `expect.` chain (no separate import).

The cost is `expect.extend` setup. Worth it for matchers used in more than one place.

### 3.4 `test.step` only for long flows

We don't wrap every two-line test in steps — it's noise. We wrap the smoke checkout flow (5 logical phases, ~30 actions). The HTML report then shows the phases as nested entries, which is much more readable when debugging a failure.

### 3.5 Visual regression as a separate project, not separate spec dir

Putting visual specs in a dedicated project means:
- They don't run in the default shard split.
- They have their own trace/screenshot policy (`trace: 'on'`).
- Updating baselines is a single, intentional CLI flag.

A spec dir-only approach would still need project-level overrides, so the project boundary is cleaner.

### 3.6 No Allure/HTML aggregator on CI

The built-in HTML reporter + the junit XML cover 95% of what people want. Adding Allure would introduce a dependency-heavy step. Easy to add later if a stakeholder asks.

---

## 4. Writing a new spec — recipe

1. **Pick the layer.** API-only (`tests/api/`), DB-side-effect (`tests/api/*.db.spec.ts`), or UI (`tests/e2e/`).
2. **Import from fixtures**, not from `@playwright/test` directly:
   ```ts
   import { test, expect } from '../fixtures';
   ```
   This gives you the custom matchers.
3. **Destructure only what you need.** Each fixture has a non-trivial setup cost; don't pull `adminUser` if the spec only uses `testUser`.
4. **Decide on auth:** add `authedPage`/`adminPage` if the test drives an authed page through the browser. The setup runs even if you don't reference the name in the body — eslint is configured to allow this.
5. **Use the Page Object** for any user-visible action. Inline `getByTestId` only as a last resort; promote it to the PO if you use it more than once.
6. **Pick your wait:**
   - DOM state → `await expect(locator).toBeVisible()` (web-first).
   - Server-side state → `await expect.poll(() => db.thing.count(), ...)`.
   - Specific network event → `Promise.all([page.waitForResponse(...), action])`.
7. **Tag** the test with `@smoke` or `@regression`. Add `@network`, `@a11y`, `@mobile` if it slots into one of those slices.

---

## 5. Running tests

From the repo root:

```bash
pnpm --filter @qa/tests test                 # full suite (chromium-desktop)
pnpm --filter @qa/tests test:smoke           # --grep @smoke
pnpm --filter @qa/tests test:regression      # --grep @regression
pnpm --filter @qa/tests test:a11y            # --grep @a11y
pnpm --filter @qa/tests test:mobile          # chromium-mobile project
pnpm --filter @qa/tests test:webkit          # webkit smoke
pnpm --filter @qa/tests test:visual          # visual regression project
pnpm --filter @qa/tests test:update-snapshots# regenerate visual baselines
pnpm --filter @qa/tests test:ui              # Playwright UI mode
```

Playwright's `webServer` config auto-boots the API + storefront. The first run also creates `tests/.auth/{user,admin}.json` via the setup project.

---

## 6. CI shape

The workflow at `.github/workflows/ci.yml`:

1. **`lint`** — fast feedback gate, runs once.
2. **`build`** — turbo builds api + web + packages. Uploads `dist/` + `.next/` as a single artifact.
3. **`test` (matrix: shard 1/2 and 2/2)** — each shard downloads the build, restores DB schema, runs the suite scoped to `--project=chromium-desktop`. PRs run `@smoke` only; pushes to `main` run the full suite. Junit XML and blob reports are uploaded.
4. **`merge-reports`** — combines blob reports into a single HTML report. Uploaded as a 14-day artifact.

The visual/mobile/webkit projects are dev-targeted by default. Wire them into CI by adding a matrix dimension for `--project` if the team wants cross-browser coverage in PRs.

---

## 7. Glossary of files

| File / dir | Purpose |
|---|---|
| `tests/fixtures/index.ts` | All fixtures (db, api, users, POs). The one file every spec imports from. |
| `tests/pages/*.page.ts` | Page Objects. One per route. Mixed-selector pattern. |
| `tests/support/api-client.ts` | Zod-validating HTTP wrapper over Playwright's request context. |
| `tests/support/matchers.ts` | Custom `expect.extend` matchers. |
| `tests/support/keys.ts` | localStorage keys shared between app + tests. |
| `tests/setup/auth.setup.ts` | Setup project — produces storageState files. |
| `tests/factories/*.factory.ts` | Faker-backed builders for test data. |
| `tests/api/*.spec.ts` | API + DB-side-effect specs (no browser). |
| `tests/e2e/*.e2e.spec.ts` | UI specs (browser, Playwright). |
| `tests/e2e/*.visual.spec.ts` | Visual regression specs (`visual` project only). |
| `tests/e2e/_generated/` | Agent-authored draft specs — excluded from runs. |
| `tests/playwright.config.ts` | Multi-project + reporter + timeouts + webServer config. |
| `tests/eslint.config.mjs` | Workspace ESLint rules. |
| `tests/.auth/` | Gitignored. Produced by setup project. |
