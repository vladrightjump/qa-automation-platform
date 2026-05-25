# Running the Project — Environment, Local, CI, MCP

## ENVIRONMENT VARIABLES

Use a single `.env.example` (committed) as the source of truth; never commit a real `.env`.

| Variable | Scope | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | db / api / tests | `postgresql://qa:qa@localhost:5432/qa?schema=public` | Prisma connection |
| `API_PORT` | api | `3001` | NestJS port |
| `JWT_SECRET` | api | `dev-secret-change-me` | token signing |
| `ENABLE_TEST_ENDPOINTS` | api | `true` (local/CI only) | guards the seed/reset test seam |
| `WEB_PORT` | web | `3000` | Next.js port |
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:3001` | browser → API base |
| `API_BASE_URL` | tests | `http://localhost:3001` | Playwright API client |
| `E2E_BASE_URL` | tests | `http://localhost:3000` | Playwright UI base URL |

---

## RUNNING LOCALLY

**Prerequisites:** macOS / Linux / WSL2 · Node 20 LTS (or 22) · Corepack (ships with Node) · Docker + Docker Compose (for Postgres) · Git.

**One Postgres definition for local + CI** — commit a `docker-compose.yml` at the repo root:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: qa
      POSTGRES_PASSWORD: qa
      POSTGRES_DB: qa
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qa"]
      interval: 5s
      timeout: 5s
      retries: 10
```

**First-time setup:**

```bash
nvm install                              # reads .nvmrc → Node 20 (or use installed Node 20/22)
corepack enable                          # provides pnpm
pnpm install
cp .env.example .env
docker compose up -d db                  # start Postgres 16
pnpm db:migrate                          # apply Prisma migrations
pnpm db:seed                             # deterministic seed data
pnpm exec playwright install --with-deps # browsers
```

**Day-to-day:**

```bash
pnpm dev                 # turbo: boots api (:3001) + web (:3000)
pnpm test                # full Playwright suite (api + db + e2e)
pnpm test --grep @smoke  # fast subset
pnpm lint && pnpm typecheck
```

> Playwright's `webServer` config (Phase 4) can boot api+web automatically, so `pnpm test` works without a separate `pnpm dev` in CI.

---

## RUNNING IN CI

GitHub Actions, mirroring the local stack so "works on my machine" == "works in CI".

- **Postgres** runs as a service container (`postgres:16`) with a `pg_isready` health check; `DATABASE_URL` points at `localhost:5432`.
- **Build once, test in parallel:** a build job (`turbo build`) produces artifacts, then a sharded Playwright matrix (`--shard=i/n`) runs specs concurrently.
- **Caching:** pnpm store (keyed on `pnpm-lock.yaml`) and the Playwright browser cache (keyed on the Playwright version).
- **Pipeline order per shard:** checkout → `actions/setup-node` (Node 20, pnpm cache) → `corepack enable` → `pnpm install --frozen-lockfile` → restore Playwright cache → `pnpm exec playwright install --with-deps` → `pnpm db:migrate && pnpm db:seed` → `pnpm test --shard=i/n`.
- **Gates:** fast `@smoke` on every PR; full `@regression` on `main`.
- **Artifacts:** upload the HTML report + traces/videos/screenshots on failure; optionally publish the merged report to GitHub Pages.
- Env in CI: `ENABLE_TEST_ENDPOINTS=true`, `JWT_SECRET` from repo secrets, DB creds matching the service container.

---

## PLAYWRIGHT MCP (optional — for agent-driven exploration & test authoring)

The [Playwright MCP](https://github.com/microsoft/playwright-mcp) server lets an agent (Claude Code) drive a real browser through the accessibility tree — useful for exploring the SUT, capturing selectors, and drafting specs faster. It is a **dev/authoring aid and the engine for Phase 7**, not part of the deterministic CI suite.

Commit `.mcp.json` at the repo root so the whole team gets it:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chromium"]
    }
  }
}
```

Or register it ad hoc in Claude Code:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

**Guardrails:** point it at the local SUT (`http://localhost:3000`) only; keep it out of CI; treat anything it generates as a *draft* that must pass review and the standards in [architecture.md](./architecture.md) before being committed.
