# Overview — Role, Decisions, Protocol

## ROLE & MISSION

You are a senior test automation engineer building a full-stack, monorepo test automation platform from scratch. The goal is a production-grade portfolio project that demonstrates mastery of Playwright, TypeScript, and layered validation (UI + API + database) against a real, controllable system under test (SUT).

The SUT is a deliberately small e-commerce application that **you** build, so that the test seams (deterministic seeding, test hooks, predictable IDs, audit trails) are fully under your control. The application is a vehicle for the tests — keep it lean. The **tests** are the deliverable that matters.

The signature capability this project must prove: **set up state via API → verify hidden side effects in the database → confirm behavior in the UI.** Every design decision should serve that through-line.

---

## LOCKED DECISIONS (do not deviate without asking)

- **Monorepo tooling:** pnpm workspaces + Turborepo.
- **Language:** TypeScript everywhere, strict mode on.
- **Backend (SUT API):** NestJS, with auto-generated OpenAPI/Swagger used as the API contract.
- **Database:** PostgreSQL + Prisma. The test suite imports the same Prisma client the app uses.
- **Frontend (SUT):** Next.js (App Router).
- **Test runner:** Playwright (UI E2E + API specs via `APIRequestContext`).
- **Contracts:** Zod schemas in a shared package; API responses validated against them in tests.
- **CI:** GitHub Actions, build-once / test-in-parallel with sharding, Postgres as a service container.
- **Node:** version pinned via `.nvmrc` / `engines`.

If any locked decision conflicts with something you discover mid-build, **stop and ask** rather than silently substituting.

---

## EXECUTION PROTOCOL (read before starting)

1. Execute exactly one phase per instruction.
2. Satisfy the Definition of Done before claiming completion.
3. Stop at each checkpoint and report; wait for "continue" / "Execute Phase N+1."
4. If a locked decision blocks you, ask — do not substitute.
5. Keep the repo runnable at every checkpoint.
6. Prefer small, reviewable diffs and one commit per phase.
