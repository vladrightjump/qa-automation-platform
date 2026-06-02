# Phase 14 — Internationalization, geolocation & a device-emulation matrix

> **Type:** SUT feature extension **+** test-infra extension. Two halves that
> reinforce each other: the storefront learns to localize and to react to the
> visitor's location, and the Playwright config grows a built-in device-emulation
> matrix (mobile + tablet) that exercises exactly those new, locale- and
> location-sensitive surfaces. No third-party device cloud, no Appium — every
> emulator is a Playwright `devices` descriptor.

**Problem / motivation:** The storefront is single-locale, USD-only, and
location-blind. That leaves three rich, classically bug-prone surfaces with **zero
coverage**:

- **i18n** — string translation, and locale-correct number / currency / date
  formatting. The canonical "looks fine in `en-US`, breaks in `de-DE`" bug
  (decimal comma, `€` placement, pluralization) has nowhere to be caught.
- **Geolocation** — the browser Geolocation API and permission prompt, plus
  country→locale/currency suggestion. Playwright emulates `geolocation`,
  `permissions`, `locale`, and `timezoneId` natively; today nothing uses them.
- **Device emulation** — one `chromium-mobile` (Pixel 5) project exists, but
  there is no tablet coverage and no responsive-layout assertions. Tablet
  breakpoints (the 1-col → 2-col → 3-col grid transitions) are untested.

These compose: the strongest single test in this phase is *"on an iPad, near
Berlin, with `de-DE`, the deals render in euros, in the tablet grid, while the
order row in the DB stays canonical USD cents."*

**Objective:** Localize the storefront across `en-US` / `de-DE` / `fr-FR` with a
canonical-USD DB and locale-formatted display; add a deterministic geolocation
resolve + suggestion flow; and grow the Playwright projects into a built-in
mobile **and** tablet emulation matrix with responsive-layout and
locale/geo-aware specs.

> **Locked invariant — the cross-layer story.** Money is stored and computed
> **only** in canonical USD `*Cents` integers (unchanged schema semantics).
> Localization is a **display + suggestion** concern. Every e2e test that asserts
> a localized currency string must *also* assert the DB row is still USD cents.
> This is the project's signature philosophy applied to i18n: the UI localizes,
> the ground truth does not move.

---

## Build

### Locale & currency config (`packages/contracts/src/i18n.ts`)
- `SUPPORTED_LOCALES = ['en-US', 'de-DE', 'fr-FR'] as const`; `DEFAULT_LOCALE = 'en-US'`.
- `LocaleSchema` (Zod enum over the above) — the single source of truth, imported
  by web, API, and tests per the Phase 10 contracts-as-SoT rule.
- `LOCALE_CURRENCY: Record<Locale, 'USD' | 'EUR'>` (`en-US`→USD, `de-DE`/`fr-FR`→EUR).
- **Deterministic** static FX table `FX_RATES_FROM_USD: Record<Currency, number>`
  (e.g. `USD: 1`, `EUR: 0.92`) — a fixed constant, *not* a live feed, so converted
  amounts are assertable. `convertCents(usdCents, currency)` + `formatMoney(cents,
  locale)` helpers (the latter over `Intl.NumberFormat`). Round-half-up, documented.

### Data model (`packages/db/prisma/schema.prisma`)
- `User.preferredLocale String?` — persisted preference for a signed-in user
  (null = infer from geo/Accept-Language).
- New `Region` model for geo resolution: `{ id, country (ISO-2, unique), name,
  locale, currency, lat Float, lng Float }`. Deterministic IDs (`region_us`,
  `region_de`, `region_fr`) so fixtures/assertions stay stable across CI shards.
- Migration `…_add_i18n_and_regions`; regenerate the client.
- Seed (`packages/db/src/seed-helpers.ts`): US (New York), DE (Berlin), FR (Paris)
  regions with their canonical lat/lng, locale, and currency.

### API (`apps/api/src`)
- **`GeoModule` / `GeoController`** (public, no auth):
  - `GET /geo/resolve?lat=&lng=` → nearest seeded `Region` by great-circle
    (haversine) distance → `{ country, name, locale, currency }`. Pure,
    deterministic math = a clean API-contract + DB-less assertion surface.
    Validate lat∈[-90,90], lng∈[-180,180] (400 otherwise).
  - `GET /geo/regions` → the supported regions list (for the override dropdown).
- **Locale preference** on the existing auth/user surface: `PATCH /me/locale`
  (authed) validates against `LocaleSchema`, persists `User.preferredLocale`,
  writes a `LOCALE_CHANGED` audit row. Reject unsupported locales (400).
- Contracts (`packages/contracts/src/index.ts`): `RegionSchema`,
  `GeoResolveSchema`, exported types. **No money math changes** — totals stay USD.

### Web (`apps/web`)
- **i18n runtime** via `next-intl` (App Router): message catalogs
  `apps/web/messages/{en-US,de-DE,fr-FR}.json`, a locale provider in the root
  layout, locale resolved from (1) `User.preferredLocale`, else (2) the
  `NEXT_LOCALE` cookie, else (3) the geo suggestion, else `DEFAULT_LOCALE`.
  Translate the navbar, product card, cart, and checkout review strings (enough
  surface to test — not every string in the app).
- **Currency display:** prices render through `formatMoney(priceCents, locale)`.
  `priceCents` remains the USD base; non-USD locales show the converted, formatted
  value. A small "prices shown in {currency}" affordance.
- **Locale switcher** in the navbar — `data-testid="locale-switcher"`,
  options `locale-option-<locale>`. Sets the cookie and, when authed, calls
  `PATCH /me/locale`.
- **Geolocation banner** (`components/GeoBanner`): on first load, request
  `navigator.geolocation`; on grant, call `GET /geo/resolve` and show
  *"Shipping to 🇩🇪 Germany — prices in EUR · Change"* with an accept/override
  control; on deny or unavailable, fall back silently to the cookie/default and
  surface a manual region picker. Test ids: `geo-banner`, `geo-accept`,
  `geo-dismiss`, `geo-region-select`.

### Test infra — the device-emulation matrix (`tests/playwright.config.ts`)
- Keep `chromium-mobile` (Pixel 5); **add** `webkit-mobile` (`devices['iPhone 14']`)
  so both engines have a phone form factor. Both stay `grep: /@smoke|@mobile/`.
- **New `tablet` projects** (built-in descriptors, no external infra):
  - `tablet-ipad` → `devices['iPad (gen 7)']` (webkit).
  - `tablet-android` → `devices['Galaxy Tab S4']` (chromium).
  - Both `dependencies: ['setup']`, `grep: /@smoke|@tablet/`,
    `testIgnore: ['**/*.visual.spec.ts']`.
- A reusable helper `tests/support/devices.ts` documenting the matrix
  (form factor → viewport → which tags it runs) so the config stays readable.
- **Demonstrate Playwright's built-in emulation context options** in the locale/geo
  specs via `test.use({ locale, timezoneId, geolocation, permissions:
  ['geolocation'] })` — the whole point of "built-in emulators": no real devices.
- `tests/package.json` scripts: `test:tablet` (`--project tablet-ipad
  --project tablet-android`), and extend `test:mobile` to include `webkit-mobile`.

### Tests (native tags per Phase 13 — `@i18n`, `@geo`, `@tablet`, `@mobile`)
- `tests/support/api-client.ts` → `resolveGeo(lat, lng)`, `listRegions()`,
  `setLocale(token, locale)`.
- `tests/api/geo.api.spec.ts` (`@geo`) — resolve contract; Berlin coords → DE/EUR;
  boundary/invalid lat-lng → 400; `LOCALE_CHANGED` audit ground truth on
  `PATCH /me/locale` (`@geo @sanity`).
- `tests/e2e/i18n.e2e.spec.ts` (`@i18n`) — switch locale via the navbar; assert
  translated strings **and** `formatMoney` output (`€` / decimal comma for `de-DE`);
  **then assert the product/order `*Cents` in the DB are unchanged USD** (the
  locked invariant). One case tagged `@i18n @sanity`.
- `tests/e2e/geolocation.e2e.spec.ts` (`@geo`) — `test.use({ geolocation:
  <Berlin>, permissions: ['geolocation'], locale: 'de-DE' })`: banner suggests
  Germany/EUR → accept → prices localize. A second case **denies** the permission
  and asserts the silent fallback + manual picker.
- `tests/e2e/responsive.e2e.spec.ts` (`@tablet @mobile`) — assert the product grid
  column count per breakpoint (mobile 1-col, tablet 2-col, desktop 3-col) and that
  tablet-only affordances render; runs across the device projects.
- Visual: `tests/e2e/tablet.visual.spec.ts` in the `visual` project lineage (or a
  tablet-scoped visual project) — `toHaveScreenshot` of the localized storefront at
  tablet width with dynamic regions masked. Baselines via `test:update-snapshots`.
- Page Objects: extend `navbar`/`checkout`/storefront POMs with locale-switcher and
  geo-banner accessors (intent, not click mechanics).

---

## Definition of Done

- `pnpm db:migrate && pnpm db:seed`, `pnpm build`, `pnpm typecheck`, `pnpm lint`
  all green across the monorepo.
- `pnpm --filter @qa/tests test:feature @i18n`, `… @geo`, and `… @tablet` all pass.
- `pnpm --filter @qa/tests test:tablet` runs the iPad + Android-tablet projects green;
  `test:mobile` now covers both phone engines.
- `pnpm --filter @qa/tests test:sanity` includes the new `@i18n`/`@geo` sanity tests
  and passes (sanity gate grows by the new features).
- The locked invariant is enforced by at least one e2e assertion: a localized
  currency string on screen **with** a USD-cents DB ground-truth check in the same test.
- `test:update-snapshots` regenerates the tablet visual baselines; committed.
- `README.md` (test table + the device matrix in ARCHITECTURE §6 "Multi-project
  config") and `tests/TESTING.md` (tag taxonomy: add `@i18n`, `@geo`, `@tablet`)
  updated.

## Status — 📋 Planned (not started)

Authored as the next feature phase. No code written yet.

## Follow-ups (out of scope)

- **RTL** locales (e.g. `ar`) and bidi layout assertions.
- **Live FX** (the table here is deliberately static for determinism); a rate
  provider + cache-staleness tests would be a separate phase.
- **Reverse-geocoding via a real provider** (current resolve is nearest-seeded-region
  only); and IP-based country detection at the edge.
- **Per-locale SEO** (`hreflang`, localized routes `/{locale}/…`) — this phase uses
  cookie/preference resolution, not locale-prefixed paths.
- Real-device cloud (BrowserStack/Sauce) as a CI-optional project alongside the
  built-in emulators.
