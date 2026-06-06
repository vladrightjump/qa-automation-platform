# Research — stack & behavior analysis, opportunities for more coverage

> A scoped audit of what the QA Automation Platform actually tests
> today, where the structural blind spots are, and which moves
> genuinely raise the portfolio's interview value without trading away
> sustainability.
>
> **Read the honest critique in §0 first.** It explains why this file
> was rewritten and which earlier recommendations were dropped.
>
> Companion: [`research-stack-improvements-tasks.md`](./research-stack-improvements-tasks.md)
> — index of the six phases (A–F) this audit recommends, each in its
> own `phase-<letter>-*.md` file ready to pick up cold.

---

## 0. Honest critique — what changed in this rewrite

The earlier version of this file proposed **15 tasks across 4 tiers**
adding 8+ new tools (k6, Schemathesis, Toxiproxy, testcontainers,
orval, Allure, Chromatic, Pact, OTel). On re-reading against two
pieces of ground truth, most of those recommendations were dropped:

1. **The "200 test cases" goal is already met.** The suite has
   **215 Playwright tests + 109 Vitest tests = 324 total** today
   (counted by `grep -rE "^\s*test\(" tests --include="*.spec.ts"`
   plus `*.test.ts`). The gap was never quantity.

2. **The portfolio-visible gap is scenario organization.** 43 of 57
   specs touch negative-flavor words ("invalid", "rejects", "401",
   "empty", "forbidden"…), but **0 tests carry an explicit
   `@negative` / `@edge` / `@security` / `@race` / `@boundary` tag**.
   An interviewer running `grep @negative` finds nothing — even though
   the coverage exists.

3. **"Sustainable" meant fewer moving parts, not more.** The original
   plan added 8+ tools. Each is an upgrade-path, a CI minute, a doc
   burden, a "why is this here" question in an interview. The revised
   plan adds only `vitest` + `@testing-library/react` +
   `vitest-mock-extended` — standard test-runner deps to plug the unit
   gap.

4. **A specific original recommendation was actively harmful.**
   Task H proposed testcontainers-postgres for per-worker DBs. That
   would break the "same `PrismaClient` singleton shared between API
   and tests" thesis, which is the centerpiece of `ARCHITECTURE.md`
   and the project's strongest portfolio talking point.

5. **Several originals were invisible-in-interview engineering.**
   OpenAPI ↔ Zod alignment, generated API client, OTel spans, Pact
   polyglot, Schemathesis — all technically valid; none answer
   "show me your negative coverage" or "walk me through your test
   pyramid". They were refactors dressed up as features.

6. **Two original recommendations had a within-stack equivalent.**
   - k6 load testing → a Playwright `Promise.all([…concurrent
     checkouts])` against the real API, same Prisma singleton, same
     thesis. No new tool.
   - Toxiproxy chaos → an env-guarded `/test/inject-failure?at=…`
     seam in the API + a spec that toggles it. No new tool.

The revised verdict on the original 15-task list:

| Original task | Verdict in this rewrite |
|---|---|
| A — Vitest+RTL on `apps/web` | **Keep, narrowed** → Phase E |
| B — Vitest on `apps/api` services | **Keep, narrowed** → Phase E |
| C — OpenAPI ↔ Zod alignment | Drop |
| D — Prisma ↔ Zod enum diff | Drop |
| E — k6 load | Drop / replace → Phase C race-conditions spec |
| F — Schemathesis fuzz | Drop |
| G — Expand Stryker glob | **Keep, follows from E** → Phase F |
| H — testcontainers-postgres | Drop (breaks thesis) |
| I — Playwright CT | Drop (Vitest+RTL covers it) |
| J — OTel span assertions | Drop |
| K — Toxiproxy chaos | Drop / replace → Phase C fault-injection spec |
| L — Generated API client | Drop |
| M — Allure reporter | Drop |
| N — Chromatic / Argos | Drop |
| O — Pact cross-language | Drop |

Net: **dropped 11, narrowed 2, kept 2** as Phases E and F.
Added Phases A, B, C, D — depth and organization that the original
plan missed.

---

## 1. What the platform tests today (ground truth)

### Stack snapshot

| Layer | Tech | Version |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | 9.15 / 2.9 |
| Lang | TypeScript strict | 5.9 |
| SUT API | NestJS + Prisma + Postgres | 11 / 6 / 16 |
| SUT web | Next.js App Router + React + Tailwind | 15 / 19 / 4 |
| Contracts | Zod (`@qa/contracts`) | 3.24 |
| E2E / API / a11y / visual | Playwright + @axe-core + `toHaveScreenshot` | 1.60+ |
| Unit | Vitest | 4.1 |
| Mutation | Stryker (`vitest-runner`) | 9.6 |
| Property | fast-check | 4.8 |
| Perf | Lighthouse + `playwright-lighthouse` + `web-vitals` | 13 / 4 / 5 |
| Factories | `@faker-js/faker` | 9 |
| Auth | JWT (`@nestjs/jwt`) + bcryptjs in localStorage | — |

### Spec inventory (57 spec files, 324 tests)

- **API + contract**: 23 spec files, ~125 tests (`tests/api/*.api.spec.ts`)
- **DB side-effect**: 2 spec files (`tests/api/*.db.spec.ts` — the signature surface)
- **E2E (POMs + DB ground truth)**: 28 spec files, ~88 tests (`tests/e2e/*.e2e.spec.ts`)
- **Visual**: 2 (`*.visual.spec.ts` — desktop + tablet)
- **Perf**: 2 (`*.perf.spec.ts` — Lighthouse + Web Vitals)
- **Unit (Vitest)**: 6 `.test.ts` + 4 `.prop.test.ts` in `packages/*/src/` = ~109 tests

### Playwright projects (8)

`setup` → `chromium-desktop`, `chromium-mobile` (Pixel 5),
`webkit-mobile` (iPhone 14), `tablet-ipad`, `tablet-android` (Galaxy
Tab S4), `webkit` (Desktop Safari @smoke), `visual`, `tablet-visual`,
`lighthouse-perf`. Per-project `grep` + `testIgnore`.

### Tag matrix today

168 `@regression`, 37 `@smoke`, 20 `@sanity`, plus 22 feature tags
(`@catalog ×27`, `@admin ×20`, `@cart ×16`, `@search ×13`, …). Native
Playwright `tag: [...]` arrays — `--grep @<feature>` selects across
both API + E2E layers.

**6 kind tags exist**: `@smoke`, `@regression`, `@sanity`, `@a11y`,
`@mobile`, `@tablet`, `@network`. **7 scenario-dimension kind tags
are missing**: `@negative`, `@edge`, `@boundary`, `@empty`,
`@security`, `@race`, `@slow`. This is the headline gap (Phases A + B).

### Signature capability (must not break)

`tests/api/checkout.db.spec.ts` — one transaction, four DB assertions
for side-effects the API response never surfaces (stock decrement,
audit row + metadata, cart cleared, `OrderStatus = PAID`). The `db`
worker fixture is the **same** `PrismaClient` singleton the NestJS API
uses, so reads land in the exact rows the API just wrote. This is the
project's centerpiece and **every recommendation in this audit
preserves it**.

---

## 2. What's already strong (don't disturb)

- **Three-layer validation philosophy** — API contract + hidden DB
  side-effects + UI flow, often in one spec.
- **Same-Prisma-singleton seam** — eliminates an entire class of
  mock-divergence bugs.
- **Native tag taxonomy** — one `@sanity` per feature, fast PR gate.
- **Tiered budgets as CI gates** — Lighthouse, Stryker, and axe
  thresholds are committed numbers. Test quality is itself measured.
- **Composable, scope-correct fixtures** — `db` (worker), `api` +
  `testUser` + `authedPage` (test).
- **Built-in device emulation matrix** — no Sauce/BrowserStack, runs
  in-process, fully reproducible in CI.

---

## 3. Structural blind spots (re-classified)

This section is preserved from the original audit but reframed: which
gaps the revised plan **will** close, and which it explicitly **won't**.

### Will close

3.1 **No backend unit tests on the services with real logic.** Services
in `apps/api/src/{orders,promo,geo,auth,cart}` have zero
`.spec.ts` / `.test.ts`. The transactional core is only verified by
Playwright. → **Phase E** (narrowly).

3.2 **No frontend unit tests on the components with real state logic.**
`AuthProvider`, `LocaleProvider`, `GeoBanner` carry hydration / state
logic and have zero unit coverage. → **Phase E** (3 components only).

3.3 **Mutation testing limited to pure helpers.** Stryker mutates 5
files. Once 3.1 lands, services can be added. → **Phase F**.

3.4 **No concurrency / contention testing.** Nothing exercises parallel
checkouts on the same SKU, parallel cart updates, promo redemption
cap races. → **Phase C race-conditions spec** (within Playwright).

3.5 **No fault-injection / rollback verification.** Nothing causes a
mid-transaction failure and verifies rollback. → **Phase C
fault-injection spec** (env-guarded API seam).

3.6 **No explicit negative / edge / security / empty scenario
organization.** The coverage exists; the *surface* doesn't. → **Phases
A + B + C + D**.

### Won't close (deliberately)

3.7 OpenAPI ↔ Zod alignment — invisible in interview; high maintenance.

3.8 Generated API client — pure refactor, invisible.

3.9 OpenTelemetry span assertions — niche for a QA portfolio.

3.10 Schemathesis / Restler fuzz — new tool, niche.

3.11 Toxiproxy / Pumba network chaos — replaced by 3.5 within stack.

3.12 k6 / Artillery load testing — replaced by 3.4 within stack.

3.13 Testcontainers-postgres — would break the singleton thesis.

3.14 Playwright Component Testing — Vitest+RTL covers the same logic
at lower cost; the app's components are simple enough.

3.15 Allure / ReportPortal / Chromatic / Argos — reporting upgrades
that are cosmetic for a portfolio of this size.

3.16 Pact cross-language consumer — heavy; only worth it if polyglot
is explicitly a portfolio goal.

If any of 3.7–3.16 becomes specifically valuable for a target role,
each can be revived as a one-PR addition. The architecture leaves room.

---

## 4. Recommended roadmap — six phases (sequenced)

Each phase has a dedicated file in `todos/phase-<letter>-*.md`. See
the [tasks index](./research-stack-improvements-tasks.md) for the
short-form list with dependencies.

```
Foundation (afternoon-sized; portfolio-visible immediately)
  Phase A. Kind-tag taxonomy expansion           tests/TESTING.md + scripts
  Phase B. Retag existing 57 specs               re-tag pass, no new tests

Depth (one spec per dimension, all within stack)
  Phase C. 6 signature specs                     security, jwt-tamper,
                                                  race-conditions,
                                                  fault-injection,
                                                  cross-feature matrix,
                                                  empty-states
  Phase D. 3 edge/boundary specs                 promo, loyalty, checkout

Pyramid base (Vitest + RTL only, narrowly scoped)
  Phase E. Unit tests on 3 web components + 3 api services
  Phase F. Expand Stryker mutate glob to those 3 services
```

Phase ordering rationale:
- **A before B** — define the taxonomy before applying it.
- **A + B can land same afternoon** — pure reorganization, big perceived
  jump in rigor.
- **C is independent** — six signature specs in parallel, each <80 LOC.
- **D is independent** — three small files.
- **E before F** — Stryker needs verifier tests to exist.
- **C/D/E/F are independent of each other** and can be picked off in
  any order after A+B.

---

## 5. Explicit non-recommendations (preserved from the prior audit)

These remain true and worth restating:

- **Don't replace Playwright.** Cypress / WebdriverIO bring no new
  capability. The platform's signature seam *needs* `APIRequestContext`
  and `addInitScript`.
- **Don't rip out the same-Prisma-singleton fixture.** It is the whole
  point.
- **Don't migrate to Jest.** Vitest is in place, Stryker has a Vitest
  runner, ESM is happy.
- **Don't migrate Nest → Fastify standalone / Hono.** The decorator-
  metadata bug from `ARCHITECTURE.md §5` is the reason Nest stays.
- **Don't switch Prisma → Drizzle / Kysely.** Same — the schema-as-
  source + singleton seam are load-bearing.
- **Don't migrate Next.js → Remix / Astro.** The hydration-race bug
  story is specific to Next App Router.
- **Don't introduce Cucumber / BDD.** Page Objects already read like
  intent.
- **Don't introduce Appium / real-device cloud yet.** Playwright
  `devices` is enough until the SUT grows a real mobile app.

---

## 6. Verification

Once Phases A + B land:

```bash
pnpm --filter @qa/tests test:negative     # ≥30 tests
pnpm --filter @qa/tests test:edge         # ≥15 tests
pnpm --filter @qa/tests test:security     # ≥10 tests
pnpm --filter @qa/tests test:boundary     # ≥10 tests
pnpm --filter @qa/tests test:race         # ≥3 tests after Phase C
pnpm --filter @qa/tests test:empty        # ≥6 tests after Phase C
```

Each is a non-empty list immediately demonstrable in interview.

Once Phase C lands, the platform additionally claims:
- RBAC denial matrix (≥15 cases)
- Concurrency / transaction isolation under contention
- Fault-injection / rollback verification
- Locale × region × payment matrix
- Empty-state coverage

Once E + F land, the platform additionally claims:
- A real test pyramid (units → integration → E2E → mutation)
- Mutation coverage on transactional code, not just pure helpers

That's the whole story this audit recommends telling. Nothing else.
