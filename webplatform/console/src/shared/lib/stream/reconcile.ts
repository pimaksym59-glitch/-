/**
 * Stream reconciliation helpers (Stage 2 §4). Streaming state is append-only
 * and transient; on `done` the accumulated result is reconciled into the
 * server-state cache. FS1 provides the text accumulator + a typed reconcile
 * seam; per-surface reconciliation lands with Chat/Studio/etc (FS6+).
 */
import { STREAM_DONE, type StreamEvent } from './openStream';

/** Accumulate token/text deltas from a stream into a single string. */
export function accumulateText(
  events: Iterable<StreamEvent>,
  previous = '',
): { text: string; done: boolean } {
  let text = previous;
  let done = false;
  for (const ev of events) {
    if (ev.data === STREAM_DONE) {
      done = true;
      break;
    }
    text += ev.data;
  }
  return { text, done };
}

/**
 * Reconcile a completed stream result into a cache via the provided setter.
 * Transport-agnostic so features supply their own cache write (TanStack Query
 * `setQueryData`) without this layer importing feature code.
 */
export function reconcileInto<T>(setter: (final: T) => void, final: T): void {
  setter(final);
}
