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
