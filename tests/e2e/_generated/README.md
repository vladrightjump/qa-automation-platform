# `_generated/` — Agent-authored spec drafts

Drafts produced by **Playwright MCP** (an agent driving a real browser against the local SUT). They are **deliberately excluded** from `pnpm test` and from CI:

- Each file is suffixed `.draft.spec.ts` (not `.spec.ts`) so Playwright's `testMatch` ignores it.
- The whole directory is also listed in `testIgnore` in [`tests/playwright.config.ts`](../../playwright.config.ts) for belt-and-suspenders.
- Inside each draft, the suite is wrapped in `test.describe.skip(…)` so even direct invocation no-ops.

## Workflow

1. Start the local stack (`pnpm --filter @qa/api start` + `pnpm --filter @qa/web start`).
2. With the [Playwright MCP](../../../.mcp.json) server registered in your agent (e.g. Claude Code), ask the agent to explore a flow: *"open the cart with an authenticated session and propose a test for the remove-item path."*
3. The agent emits a draft into this directory.
4. **Review like any other PR.** Promote to a real spec by:
   - moving the file out of `_generated/`,
   - renaming `*.draft.spec.ts` → `*.e2e.spec.ts` (or `*.api.spec.ts` / `*.db.spec.ts`),
   - removing `.skip` and the `@draft` tag,
   - tagging `@smoke` or `@regression`,
   - making sure it follows the standards in [`todos/architecture.md`](../../../todos/architecture.md) (Page Objects, no `waitForTimeout`, intent-revealing names, etc.).

## Boundaries — what this layer does **not** do

- Does **not** run in CI. CI executes only `*.spec.ts` and explicitly ignores `_generated/`.
- Does **not** replace the deterministic suite. The 32 hand-authored specs are the source of truth.
- Does **not** assert anything until a human has reviewed and promoted the draft.

See [`todos/phase-7-agentic-mcp.md`](../../../todos/phase-7-agentic-mcp.md) for the full design notes.
