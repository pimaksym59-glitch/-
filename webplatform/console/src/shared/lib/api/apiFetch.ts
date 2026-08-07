/**
 * apiFetch — the single typed API client (Stage 2 §4, Stage 3 §8).
 * - base `/api/v1` (configurable via public env)
 * - cookie session (`credentials: 'include'`, §F7.1 — no tokens in JS)
 * - correlation id header (§11)
 * - AbortSignal on every call (cancellation)
 * - errors normalized to AppError (§4)
 *
 * The frontend is a pure client (§F3.2): this wrapper never re-implements
 * backend logic; it only speaks the frozen `/api/v1` contract (API_SPEC.md).
 */
import { getPublicConfig } from '@/shared/config/env';
import { AppError, kindFromStatus } from '@/shared/lib/errors';
import { transportGate } from './boot-gate';
import { CORRELATION_HEADER, generateCorrelationId } from './correlation-id';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serializable request body (sent as application/json). */
  readonly json?: unknown;
  /**
   * Multipart request body (FS7 additive — document upload §R9.4). The browser
   * sets the multipart boundary itself; no Content-Type is written here.
   * Mutually exclusive with `json`.
   */
  readonly formData?: FormData;
  /** Override/attach a correlation id (otherwise one is generated). */
  readonly correlationId?: string;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly correlationId: string;
  readonly status: number;
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = getPublicConfig().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, formData, correlationId, headers, signal, ...rest } = options;
  const cid = correlationId ?? generateCorrelationId();

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  finalHeaders.set(CORRELATION_HEADER, cid);
  const init: RequestInit = { ...rest, credentials: 'include', headers: finalHeaders };
  if (signal) init.signal = signal;
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    init.body = JSON.stringify(json);
    init.method = rest.method ?? 'POST';
  } else if (formData !== undefined) {
    init.body = formData;
    init.method = rest.method ?? 'POST';
  }

  let response: Response;
  try {
    // Resolved no-op outside the fixture env; in local/ci it guarantees the
    // MSW worker controls the page before the first fetch (boot-gate.ts).
    await transportGate();
    response = await fetch(resolveUrl(path), init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new AppError({
      kind: 'network',
      message: 'Network request failed.',
      correlationId: cid,
      details: cause,
    });
  }

  const serverCid = response.headers.get(CORRELATION_HEADER) ?? cid;

  if (!response.ok) {
    throw new AppError({
      kind: kindFromStatus(response.status),
      message: await safeErrorMessage(response),
      status: response.status,
      correlationId: serverCid,
    });
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { message?: string; detail?: string };
      return body.message ?? body.detail ?? `Request failed (${response.status}).`;
    }
    const text = await response.text();
    return text.slice(0, 500) || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}
