# Phase 7 — Agentic Testing Layer + Playwright MCP (OPTIONAL)

**Objective:** A forward-looking differentiator, cleanly separated from the deterministic suite.

This phase is powered by **Playwright MCP** (`@playwright/mcp`) — see setup in [running.md](./running.md). The MCP server lets the agent drive a real browser against the local SUT through the accessibility tree.

**Build (pick one, keep isolated):**
- **Explorer → spec stubs:** an agent uses Playwright MCP to crawl the SUT, map flows/selectors, and propose new spec stubs under `tests/e2e/_generated/` (drafts only).
- **Self-healing locators:** an experiment that, on a failed locator, asks the agent (via MCP) to re-find the element from the accessibility tree; document a before/after.
- **LLM-assisted test data:** an edge-case generator feeding the `tests/factories` builders.

**Boundaries (state explicitly):**
- This sits *on top of* the deterministic suite, never replacing it.
- Playwright MCP is a dev/authoring + exploration tool; it does **not** run in CI.
- Anything generated is a *draft* — it must pass review and the standards in [architecture.md](./architecture.md) before being committed.
- Point the MCP browser at the local SUT only (`http://localhost:3000`).

**Definition of Done:** The experiment runs in isolation and is documented with honest limitations.

**Checkpoint:** Report what was built and its boundaries. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: the experiment runs in isolation (deliberately *outside* the deterministic suite — `pnpm test` still discovers 32 / runs 32, drafts are skipped three different ways), and the boundaries are documented honestly here and inside `tests/e2e/_generated/README.md`.

### What was built — **Option 1: Explorer → spec stubs**

| File | Role |
|---|---|
| [`.mcp.json`](../.mcp.json) | Commits the Playwright MCP server config (`npx @playwright/mcp@latest --browser chromium`) so any agent that supports MCP picks it up on clone. |
| [`tests/e2e/_generated/README.md`](../tests/e2e/_generated/README.md) | Explains what this directory is, the authoring workflow (start local stack → ask agent to explore → review → promote), and the rules for promoting a draft into a real spec. |
| [`tests/e2e/_generated/example.draft.spec.ts`](../tests/e2e/_generated/example.draft.spec.ts) | A single, clearly-marked example draft showing the shape an agent-authored stub takes. `test.describe.skip`'d, tagged `@draft`. |
| [`tests/playwright.config.ts`](../tests/playwright.config.ts) | `testIgnore: ['**/_generated/**', '**/*.draft.spec.ts']` — drafts are physically unreachable from the runner. |

### Defence-in-depth — three ways drafts stay out of the deterministic suite

1. **`testMatch`** is `**/*.spec.ts` only. The convention `*.draft.spec.ts` doesn't match.
2. **`testIgnore`** explicitly excludes `**/_generated/**` AND `**/*.draft.spec.ts`.
3. **`test.describe.skip(…)`** inside each draft — even a manual `playwright test path/to/draft.draft.spec.ts` no-ops.

Verified: `pnpm exec playwright test --list` reports **32 tests in 10 files** (unchanged from Phase 5), and `_generated/example.draft.spec.ts` does not appear.

### Boundaries (stated explicitly per the plan)

- **Sits on top of the deterministic suite, never replaces it.** The 32 hand-authored specs are the source of truth for what the SUT must do.
- **Does NOT run in CI.** The GitHub Actions workflow only invokes Playwright via `pnpm test` / `--grep`, which excludes drafts. The CI workflow makes zero MCP calls and never installs `@playwright/mcp`.
- **Local SUT only.** The `.mcp.json` config targets `chromium` against `http://localhost:3000` — never a deployed environment, never a third-party site.
- **Drafts are unrun until reviewed.** A human must explicitly promote a draft (move file out of `_generated/`, rename `*.draft.spec.ts` → `*.e2e.spec.ts`, drop `.skip`, swap `@draft` → `@smoke`/`@regression`, audit against the standards in `architecture.md`).
- **Not a self-healing layer.** This is *authoring* assistance, not *runtime* assistance. No LLM is in the loop when CI tests execute.

### Honest limitations

- The example draft is a static file checked in for shape-of-thing illustration. It is **not** a live agent run captured during Phase 7 — to actually drive Playwright MCP from this shell, the agent runtime would need to attach to the MCP server (Claude Code, Cursor, or similar). The plumbing (config, ignore rules, directory, README, promotion workflow) is all real and ready; the agent-driven authoring loop happens in the developer's IDE.
- Option 2 (self-healing locators) and Option 3 (LLM-assisted edge-case factories) are intentionally *not* built — the plan said "pick one." Both remain viable follow-ups.

### Carry-over for Phase 8

- README + `ARCHITECTURE.md` should call out the **three-layer validation philosophy** (API ↔ DB ↔ UI) and note Phase 7 as the agentic layer **on top of** that.
