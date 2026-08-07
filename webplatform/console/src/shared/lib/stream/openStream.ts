/**
 * openStream — SSE-over-fetch (Stage 2 §4 / FE-ADR-9). Uses fetch +
 * ReadableStream so the auth cookie is sent (unlike EventSource) and the
 * stream is cancelable via AbortSignal (Stop). Yields parsed SSE events; the
 * caller reconciles the final value into the Query cache on completion.
 *
 * Backend SSE endpoints are optional-future work (RV); a polling fallback is
 * used where they do not yet exist — no backend change is required.
 */
import { AppError, kindFromStatus } from '@/shared/lib/errors';

export interface StreamEvent {
  /** SSE `event:` type (defaults to 'message'). */
  readonly event: string;
  /** SSE `data:` payload (joined across multi-line data fields). */
  readonly data: string;
  readonly id?: string;
}

/** Sentinel some backends emit to mark the end of a stream. */
export const STREAM_DONE = '[DONE]';

export interface OpenStreamInit extends Omit<RequestInit, 'signal'> {
  readonly signal?: AbortSignal;
}

/**
 * Open an SSE stream and yield events as they arrive. Throws AppError on a
 * non-2xx response or a missing body; AbortError propagates on cancellation.
 */
export async function* openStream(
  url: string,
  init: OpenStreamInit = {},
): AsyncGenerator<StreamEvent, void, unknown> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'text/event-stream', ...init.headers },
  });

  if (!response.ok) {
    throw new AppError({
      kind: kindFromStatus(response.status),
      message: `Stream failed (${response.status}).`,
      status: response.status,
    });
  }
  if (!response.body) {
    throw new AppError({ kind: 'server', message: 'Stream response had no body.' });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex = buffer.indexOf('\n\n');
      while (sepIndex !== -1) {
        const rawFrame = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const event = parseFrame(rawFrame);
        if (event) yield event;
        sepIndex = buffer.indexOf('\n\n');
      }
    }
    const tail = parseFrame(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

/** Parse one SSE frame (a block of `field: value` lines) into a StreamEvent. */
export function parseFrame(raw: string): StreamEvent | null {
  const lines = raw.split('\n');
  const dataParts: string[] = [];
  let event = 'message';
  let id: string | undefined;

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue; // comment/keepalive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const rawValue = colon === -1 ? '' : line.slice(colon + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;
    if (field === 'data') dataParts.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
  }

  if (dataParts.length === 0 && event === 'message') return null;
  const base: StreamEvent = { event, data: dataParts.join('\n') };
  return id === undefined ? base : { ...base, id };
}
