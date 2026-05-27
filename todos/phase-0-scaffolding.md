# Phase 0 — Repo Scaffolding & Tooling

**Objective:** A clean, runnable monorepo skeleton with shared tooling.

**Build:**
- Initialize pnpm workspace + Turborepo with the directory structure in [architecture.md](./architecture.md) (empty/placeholder packages OK).
- Shared `packages/config`: base `tsconfig`, ESLint (typescript-eslint), Prettier.
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`.
- `.env.example`, `.nvmrc` (Node 20), `.gitignore`, root `README.md` stub.
- `docker-compose.yml` with the Postgres 16 service (see [running.md](./running.md)) so local + CI share one DB definition.
- `turbo.json` task pipeline wired so `build`/`lint`/`typecheck` run across workspaces.

**Definition of Done:** `pnpm install`, `pnpm lint`, and `pnpm typecheck` all pass on an empty skeleton.

**Checkpoint:** Report the final tree and the contents of `turbo.json` + root `package.json`. Stop.

---

## ✅ Status — DONE (commit `0e8f761`)

DoD met: `pnpm install` (7 workspaces), `pnpm typecheck` (6/6), `pnpm lint` (6/6) all pass.

**As built:**
- Workspaces: `apps/{api,web}`, `packages/{config,db,contracts}`, `tests` (globs `apps/*`, `packages/*`, `tests`).
- Each workspace has `lint` (`eslint .`) + `typecheck` (`tsc --noEmit`) and reuses `@qa/config` via **relative imports** for eslint/tsconfig.
- **Tooling lives only at the repo root** (eslint, typescript-eslint, typescript, prettier, turbo). Packages resolve binaries + plugins via Node's upward `node_modules`/`.bin` lookup — no per-package duplication. `@qa/config` itself declares no deps.
- Placeholder `src/index.ts` (`export {};`) in each TS package so empty packages still type-check; empty `tests/*` subdirs hold `.gitkeep`.
- `packages/db` ships no-op `migrate`/`seed` scripts wired to root `db:migrate` / `db:seed` (real impl in Phase 1).
- Root files: `turbo.json` (Turbo 2 `tasks` schema), `pnpm-workspace.yaml`, `.nvmrc` (20), `.gitignore`, `.env.example`, `docker-compose.yml` (Postgres 16), `README.md`, root `eslint.config.mjs` / `prettier.config.mjs` / `tsconfig.json`.

**Deviations from the original plan:**
- **Node 20, not 22.** Dev machine runs Node 20.19.6 with no version manager available; the locked decision only requires Node be *pinned*. `engines` = `>=20 <23`, so 22 still works and bumping later is trivial. Reflected in [tech-stack.md](./tech-stack.md) and [running.md](./running.md).

**Carry-over for Phase 1:** Docker is **not installed** on this machine; Phase 1 (`db:migrate`/`db:seed`) needs a reachable PostgreSQL — install Docker Desktop and run `docker compose up -d db`, or set `DATABASE_URL` to a local/hosted Postgres.
