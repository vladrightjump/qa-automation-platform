# Phase 8 — Documentation & Portfolio Polish

**Objective:** Make the design decisions legible to a reviewer/interviewer.

**Build:**
- README: architecture diagram, the three-layer validation philosophy, how to run, how CI works.
- An `ARCHITECTURE.md` explaining fixture composition, isolation strategy, and why API-driven setup.
- A short "what this demonstrates" section aimed at interviewers.
- Link to the live CI report if published.

**Definition of Done:** A reviewer can understand the design and run the project from the README alone.

**Checkpoint:** Report the README outline. Done.

---

## ✅ Status — DONE (uncommitted)

DoD met: A reviewer can understand the design and run the project from the root `README.md` alone. The deep design notes (fixture composition, isolation strategy, why API-driven setup, real bugs the suite caught) live in the new `ARCHITECTURE.md`.

### Root [`README.md`](../README.md) — final outline

1. **Title + tagline + status** — single sentence on the signature capability (API → DB → UI in one test, same Prisma client).
2. **What this demonstrates** — six interviewer-facing bullets (cross-layer validation, test-first SUT, Zod contract testing, parallel isolation, CI shape, real bugs caught).
3. **Architecture diagram** — ASCII diagram showing `tests → fixtures → SUT → Postgres` with the singleton client explicitly called out.
4. **The three-layer validation philosophy** — table mapping API/DB/UI to what each layer asserts and what each one *uniquely* catches.
5. **Stack** — compact one-liner with versions; link to `tech-stack.md` for full pins.
6. **Repo layout** — annotated tree.
7. **Quick start** — fully runnable from scratch (Postgres via Docker OR Homebrew, migrate + seed, four `pnpm` builds, `playwright install`, `pnpm test`).
8. **Tests** — counts by tag (32 total / 9 smoke / 23 regression) + layer breakdown.
9. **CI** — job-graph diagram + behavior summary (PR vs main, caching, artifacts).
10. **Agentic authoring (Phase 7, optional)** — pointer to the `.mcp.json` + drafts directory + three-way exclusion.
11. **Further reading** — `ARCHITECTURE.md`, `todos/`, Swagger UI link.

### [`ARCHITECTURE.md`](../ARCHITECTURE.md) — what it covers

1. **The three-layer validation philosophy** — the *why* (which class of bug each layer catches that the others can't), plus the signature checkout DB spec as concrete illustration.
2. **Fixture composition** — table of `db` / `api` / `testUser` / `authedPage` with scope + provides + dependency chain. Explains why `db` is worker-scoped and why `authedPage` uses `addInitScript`.
3. **Isolation strategy** — per-test users via faker + per-test products via factory; shared seed used read-only; why specs don't call `resetTestData()`; Postgres connection budget.
4. **Why API-driven setup** — speed, reliability, intent clarity. The `/test/reset` seam. What the trade gives up and how the explicit UI specs cover that.
5. **Real cross-layer bugs caught** — three case studies: missing CORS (curl couldn't see it), the React hydration race (browser navigation revealed it), `emitDecoratorMetadata` stripped by `tsx` (first API boot caught it). Each with what failed, why, and the fix.
6. **File map** — table of "where to find what" for the rest of the repo.

### What did NOT change

- The build plan in `todos/` is preserved — Phase 8 doesn't rewrite earlier phases' "As built" blocks. The intent is that anyone reading the project sees both the *final* polished docs *and* the original incremental plan with its history.
- No test code, app code, or workflow code touched. Documentation-only phase.

### Carry-over / "if I were to keep going"

- **Live CI report link.** Once the repo is on GitHub and a green run completes, swap the README's _"TBD"_ line under "Live CI report" for the actual URL (either the artifact link or a GH Pages publish).
- **Screenshot / GIF.** A 5-second GIF of `pnpm test` running green would punch above its weight on a portfolio README. Add one when the project is up on GitHub.
- **Phase 9 (out of scope).** Promoting an example agent-authored draft into a real spec — closes the Phase 7 loop end-to-end.
