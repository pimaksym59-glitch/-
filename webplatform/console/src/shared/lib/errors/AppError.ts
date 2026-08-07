/**
 * AppError — the single normalized client error shape (Stage 2 §4).
 * Every API/stream failure is mapped to one of these kinds and routed to the
 * Error Recovery matrix (D4 §8). `gated` is distinct from a real failure
 * (§R10.3 — gated data is honest, never fabricated, never an error wall).
 */
export type AppErrorKind =
  | 'validation'
  | 'permission'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'network'
  | 'server'
  | 'gated'
  | 'unknown';

export interface AppErrorInit {
  readonly kind: AppErrorKind;
  readonly message: string;
  readonly status?: number;
  readonly correlationId?: string;
  readonly retryable?: boolean;
  readonly details?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number | undefined;
  readonly correlationId: string | undefined;
  readonly retryable: boolean;
  readonly details: unknown;

  constructor(init: AppErrorInit) {
    super(init.message);
    this.name = 'AppError';
    this.kind = init.kind;
    this.status = init.status;
    this.correlationId = init.correlationId;
    this.retryable = init.retryable ?? DEFAULT_RETRYABLE.has(init.kind);
    this.details = init.details;
  }
}

const DEFAULT_RETRYABLE: ReadonlySet<AppErrorKind> = new Set<AppErrorKind>([
  'network',
  'server',
  'rateLimit',
]);

/** Map an HTTP status to an AppError kind (Stage 2 §4). */
export function kindFromStatus(status: number): AppErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401 || status === 403) return 'permission';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
