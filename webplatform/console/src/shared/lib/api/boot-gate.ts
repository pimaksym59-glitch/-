/**
 * Transport boot gate (FS7 §6 defect fix). RESOLVED by default — on the
 * production path `apiFetch` awaits an already-settled promise (one no-op
 * microtask). The fixture environment (FixtureBoot, local/ci only) swaps in a
 * pending promise that resolves once the MSW worker actually CONTROLS the
 * page, so the first client fetch after a HARD navigation can never race the
 * interceptor and 404 (a latent FS5-era race: 4xx skips retry, so one lost
 * race stuck the shared `['channels']` key in error — surfaced by the FS7
 * knowledge journeys, the first E2E to hard-`goto` a data screen).
 *
 * This module is deliberately fixture-agnostic: it imports nothing, holds no
 * env logic, and is legal in every build (the kill-switched fixture modules
 * stay dynamic-import-only per the FS5 grep lock).
 */
let gate: Promise<void> = Promise.resolve();

/** Swap the gate (fixture boot only). */
export function setTransportGate(next: Promise<void>): void {
  gate = next;
}

/** Awaited by `apiFetch` before the first byte leaves the client. */
export function transportGate(): Promise<void> {
  return gate;
}
