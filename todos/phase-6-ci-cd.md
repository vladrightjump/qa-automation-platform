# Phase 6 — CI/CD Pipeline

**Objective:** GitHub Actions running the suite reliably with artifacts.

> See [running.md](./running.md) for the env vars, Postgres service container, and per-shard pipeline order this phase implements.

**Build:**
- Workflow: build-once job, then a sharded Playwright matrix.
- Postgres as a service container; run migrate + seed before specs.
- Cache pnpm store and Playwright browsers.
- Upload HTML report + traces as artifacts; optionally publish report to GitHub Pages.
- Separate fast `@smoke` gate on PRs from full `@regression` on main.

**Definition of Done:** Push triggers a green run; report + traces downloadable from the run.

**Checkpoint:** Report the workflow YAML and sharding strategy. Stop.
