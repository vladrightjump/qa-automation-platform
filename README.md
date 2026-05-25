# QA Automation Platform

A full-stack, monorepo **test automation** portfolio project. A deliberately small e-commerce app (the SUT) exists only as a vehicle for the tests. The signature capability it demonstrates: **set up state via API → verify hidden side effects in the database → confirm behavior in the UI.**

> Status: **Phase 0 complete** — runnable monorepo skeleton. See [`todos/`](./todos) for the full build plan and remaining phases.

## Stack

pnpm workspaces + Turborepo · TypeScript (strict) · NestJS + Prisma + PostgreSQL · Next.js (App Router) · Playwright · Zod. Full pinned versions: [`todos/tech-stack.md`](./todos/tech-stack.md).

## Layout

```
apps/        web (Next.js storefront), api (NestJS)
packages/    db (Prisma), contracts (Zod), config (shared tsconfig/eslint/prettier)
tests/       e2e, api, pages, fixtures, factories, support
```

## Quick start

```bash
corepack enable          # provides pnpm
pnpm install
pnpm lint
pnpm typecheck
```

Full local + CI instructions: [`todos/running.md`](./todos/running.md).
