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

---

## 🟡 Status — workflow authored, awaiting first push (uncommitted)

The workflow file (`.github/workflows/ci.yml`) is written and **YAML-validated locally** (4 jobs, correct `needs` graph, Postgres service, `pnpm` + Playwright caching, sharded matrix, artifact uploads, merged HTML report). The piece that *can't* be done from this environment is the actual "push triggers a green run" — that needs a GitHub remote and a push, which the user owns.

### Job graph

```
lint  ─┐                                                 (fast feedback)
build ─┴──► test (shard 1/2) ──┐
              test (shard 2/2) ──┴──► merge-reports
```

| Job | What it does | Notes |
|---|---|---|
| `lint` | `pnpm install --frozen-lockfile` → `pnpm lint` + `pnpm typecheck` | independent — fails fast on style/type issues |
| `build` | `pnpm build` (turbo: db → contracts → api → web), uploads `build-output` artifact | excludes `apps/web/.next/cache` to keep the artifact small |
| `test` | matrix `shard: [1, 2] / total: 2`; restores `build-output`; launches Postgres 16 service container; `pnpm db:migrate && pnpm db:seed`; `playwright test --shard=N/M --reporter=blob,list`; PRs add `--grep @smoke` | per-shard `blob-report-N` always uploaded; `test-results-N` (traces/videos/screenshots) only on failure |
| `merge-reports` | downloads all `blob-report-*`, runs `playwright merge-reports --reporter html`, uploads `playwright-report` artifact | `if: always()` so the report survives failures |

### Sharding strategy

- **Two shards**, `--shard=1/2` and `--shard=2/2`. Playwright deterministically partitions specs across shards (by file, then by test) so each shard does ~half the work, in parallel.
- Two is right-sized for the current 32-spec suite (~6 s wall time end-to-end). When the suite grows past ~50 specs, bump the matrix to `[1, 2, 3]` with `total: 3` (one-line change).
- `fail-fast: false` so a failing shard doesn't cancel the other — we want all failures visible in one run.

### Caching

- **pnpm store** via `actions/setup-node@v4` with `cache: 'pnpm'`, keyed on `pnpm-lock.yaml` automatically.
- **Playwright browsers** via `actions/cache@v4` at `~/.cache/ms-playwright`, key `${{ runner.os }}-pw-${{ hashFiles('pnpm-lock.yaml') }}` (playwright version is pinned in the lockfile, so the key churns only when the version changes). On a cache hit we still run `playwright install-deps chromium` to install OS-level libs that don't live in `~/.cache`.

### PR gate vs main gate

```bash
if [ "${{ github.event_name }}" = "pull_request" ]; then
  GREP_ARGS="--grep @smoke"   # 9 specs, ~5 s wall — fast PR feedback
fi
playwright test --shard=… $GREP_ARGS
```

Push to `main` runs the full suite (32 specs); PRs run `@smoke` only.

### Concurrency

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Stacking commits on a PR cancels in-flight runs; pushes to `main` queue (we want every main commit verified).

### Artifacts (downloadable from any run)

- `playwright-report` — merged HTML report (14-day retention).
- `blob-report-1`, `blob-report-2` — raw per-shard reports (7-day).
- `test-results-1`, `test-results-2` — traces, videos, screenshots; **failure-only** (7-day).

### Env

The same env vars from `.env.example` are set at the workflow level (DATABASE_URL points at the service container, `ENABLE_TEST_ENDPOINTS=true`, etc.) and re-mirrored to `.env` before the db scripts run (their `dotenv-cli` wrapper expects the file).

### Carry-over

- **Verification:** push to a GitHub repo to actually exercise this. The plan's DoD ("push triggers a green run") is the user's step — workflows can't be dry-run end-to-end locally (`act` gets close for some jobs but not service containers + multi-job artifacts).
- **GitHub Pages publish (optional in plan):** skipped for now. Add a fifth job after `merge-reports` if you want the report at `https://<user>.github.io/<repo>/`.
- **Skip Phase 7 in CI:** the agentic / MCP experiment (Phase 7) is intentionally a dev-only / authoring layer; this workflow does **not** invoke Playwright MCP.
