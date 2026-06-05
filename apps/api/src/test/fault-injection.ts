// Fault-injection seam used by chaos specs to assert transactional
// rollback. The only consumer is `OrdersService.checkout`, which calls
// `maybeInjectFailure('stock-decrement', userId)` inside the existing
// $transaction so a throw rolls back the order, audit log, cart-clear
// and stock decrement in one shot.
//
// The trap is scoped per-userId so a chaos spec running in parallel with
// other checkout-touching specs only fires for its own user. Each entry
// is one-shot — once fired it auto-clears, so a spec that crashes after
// arming can't poison the next run. `clearFaultInjection()` is also
// wired into POST /test/reset for belt-and-braces.

const injectedStages = new Map<string, string>();

export function setFaultStage(userId: string, stage: string | null): void {
  if (stage == null) injectedStages.delete(userId);
  else injectedStages.set(userId, stage);
}

export function clearFaultInjection(): void {
  injectedStages.clear();
}

export function maybeInjectFailure(stage: string, userId: string): void {
  if (injectedStages.get(userId) === stage) {
    injectedStages.delete(userId);
    throw new Error(`injected failure at stage: ${stage}`);
  }
}
