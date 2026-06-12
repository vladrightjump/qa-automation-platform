# Testing

How to run the suite locally and how to debug a failure.

## Running

```sh
# Full suite (e2e + api), chromium-desktop:
pnpm -F @qa/tests test

# Smoke only — fast feedback during development:
pnpm -F @qa/tests test:smoke

# A single file:
pnpm -F @qa/tests exec playwright test e2e/checkout.e2e.spec.ts

# A single test by name:
pnpm -F @qa/tests exec playwright test --grep "cancel button on a PAID order"

# Interactive UI mode (great for authoring):
pnpm -F @qa/tests test:ui
```

Playwright boots the API + web automatically and reuses anything
already listening. If something is broken locally, kill the rogue
process or `pkill -f "@qa/api"`.

## Common assertion patterns

```ts
// Web matcher — count, not "$count items"
await expect(authedPage).toHaveCartCount(2);

// Polling for a DB side-effect (audit log row written async):
await expect
  .poll(() => db.auditLog.count({ where: { action: 'ORDER_PAID' } }))
  .toBe(1);

// Soft assertions surface multiple failures at once:
await expect.soft(cart.item(a.id)).toBeVisible();
await expect.soft(cart.subtotal()).toHaveText(/\$30\.00/);

// Negative-path: inspect the raw response without throwing:
const res = await api.raw().post(`${API_BASE}/orders`, {
  headers: { Authorization: `Bearer ${other.token}` },
});
expect(res.status()).toBe(403);
```

## Debugging a failure

1. Open the HTML report: `pnpm -F @qa/tests exec playwright show-report`.
2. Click the failing test → step list. Each `test.step(...)` is a
   collapsible group.
3. Open the **Trace** tab. Snapshots, network calls, console logs,
   and a frame-by-frame replay — the trace viewer is the single best
   debugging tool Playwright ships.
4. CI uploads `tests/playwright-report` as an artifact; download it
   and open `index.html` locally.

Locally, traces are kept on first retry only (`trace: 'on-first-retry'`
in `playwright.config.ts`). Set `--trace=on` on the CLI to force them.
