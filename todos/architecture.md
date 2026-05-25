# Architecture & Engineering Standards

## TARGET ARCHITECTURE

```
qa-automation-platform/
├── apps/
│   ├── web/              # Next.js storefront (SUT frontend)
│   └── api/              # NestJS backend (SUT API)
├── packages/
│   ├── db/               # Prisma schema, migrations, seed scripts, exported client
│   ├── contracts/        # shared Zod schemas / generated OpenAPI types
│   └── config/           # shared tsconfig, eslint, prettier
├── tests/
│   ├── e2e/              # Playwright UI specs (hybrid: API setup, UI flow, DB assert)
│   ├── api/              # API-level + DB-validation specs
│   ├── pages/            # Page Objects
│   ├── fixtures/         # composable Playwright fixtures
│   ├── factories/        # faker-backed test-data builders
│   └── support/          # api-client, db helpers, utilities
├── .github/workflows/
├── playwright.config.ts
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
└── README.md
```

---

## GLOBAL ENGINEERING STANDARDS (enforce in every phase)

- TypeScript strict; no `any` without an inline justification comment.
- Tests must be isolated and parallel-safe: no shared mutable state between tests; per-test or per-worker data only.
- No hard sleeps (`waitForTimeout`). Use web-first assertions and the `toPass` retry pattern for eventually-consistent checks.
- Set up state via API, never via UI, unless the UI action *is* the thing under test.
- Page Objects expose intent (`placeOrder()`), not mechanics (`click('#btn')`).
- Every spec tagged: `@smoke` or `@regression`.
- Commit per phase with a clear message; never commit secrets. Use `.env.example`.
- Each phase ends with a passing state — the repo must be runnable at every checkpoint.
