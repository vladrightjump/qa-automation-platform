# Technology Stack & Pinned Versions

Pin these in `package.json` `engines`, `.nvmrc`, and lockfile. Versions are the target baseline (2026); bump only deliberately, never silently.

| Concern | Tool | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20 LTS (`.nvmrc` → `20`) | `engines: { "node": ">=20 <23" }`; 22 LTS also fine (pinned to 20 = installed dev env) |
| Package manager | pnpm | 9.x via Corepack | `corepack enable`; commit `pnpm-lock.yaml` |
| Monorepo orchestrator | Turborepo | 2.x | task pipeline + remote/local caching |
| Language | TypeScript | 5.7+ | `strict: true` everywhere |
| Backend framework | NestJS | 11.x | `@nestjs/swagger` for OpenAPI |
| Validation (server) | class-validator / class-transformer | 0.14 / 0.5 | DTO validation pipe |
| Auth | `@nestjs/jwt` + `passport-jwt` | 11.x / latest | minimal bearer/JWT |
| ORM | Prisma | 6.x | client exported from `packages/db` |
| Database | PostgreSQL | 16 | local via Docker, CI via service container |
| Frontend framework | Next.js (App Router) | 15.x | React 19 |
| UI / styling | Tailwind CSS | 4.x | minimal design system, no component lib |
| Contracts | Zod | 3.24+ | shared schemas → inferred types |
| OpenAPI ↔ types | `openapi-typescript` (or `zod-to-openapi`) | latest | generate types from `/docs` spec |
| Test runner | Playwright | 1.50+ | UI E2E + API via `APIRequestContext` |
| Agent browser control | **Playwright MCP** (`@playwright/mcp`) | latest | exposes Playwright to the agent for exploratory/authoring use and Phase 7; see [running.md](./running.md) |
| Test data | `@faker-js/faker` | 9.x | factories |
| Lint / format | ESLint 9 (flat) + `typescript-eslint` 8 + Prettier 3 | — | shared in `packages/config` |
| Local DB / CI parity | Docker + Docker Compose | latest | one Postgres definition for both |
