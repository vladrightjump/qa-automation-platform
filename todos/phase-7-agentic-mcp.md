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
