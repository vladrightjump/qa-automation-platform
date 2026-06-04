// Process-scoped fault-injection seam used by chaos specs to assert
// transactional rollback. The set/check pair is intentionally tiny — the
// only consumer is `OrdersService.checkout`, which calls
// `maybeInjectFailure('stock-decrement')` inside the existing $transaction
// so a throw rolls back the order, audit log, cart-clear and stock
// decrement in one shot.
//
// The injection is one-shot: once it fires it auto-clears, so a test that
// forgets to reset can't pollute the next run. `clearFaultInjection()`
// is also wired into POST /test/reset for belt-and-braces.

let injectedStage: string | null = null;

export function setFaultStage(stage: string | null): void {
  injectedStage = stage;
}

export function clearFaultInjection(): void {
  injectedStage = null;
}

export function maybeInjectFailure(stage: string): void {
  if (injectedStage === stage) {
    injectedStage = null;
    throw new Error(`injected failure at stage: ${stage}`);
  }
}
