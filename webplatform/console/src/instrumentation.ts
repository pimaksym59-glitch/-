/**
 * Server instrumentation bootstrap (Stage 3 §1 named this file; FS14 creates
 * it). Runs once per server process, on the server only — it ships **no client
 * bytes at all**, which is why it is the half of the observability seam that
 * carries no budget risk (plan §3.1).
 *
 * It does two things and nothing else: it announces the process in the same
 * structured shape `/api/telemetry` uses (so a deployment can correlate a
 * client event with the process that served it, §R12.9), and it records
 * `onRequestError` — Next's server-side error hook — with the same ALLOWLIST
 * discipline as the client sink: error NAME and digest, never a message, never
 * a stack, never a URL that could carry a record id.
 *
 * No vendor SDK is registered here. Binding one is an infrastructure decision
 * behind this file (plan §5.2 D6 Option A), not a client dependency.
 */

interface RequestErrorContext {
  readonly routerKind?: string;
  readonly routeType?: string;
}

/** Next attaches an opaque `digest` to server errors; anything else is dropped. */
function digestOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = (error as { digest?: unknown }).digest;
  return typeof value === 'string' ? value : undefined;
}

export function register(): void {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  process.stdout.write(
    `${JSON.stringify({
      level: 'info',
      service: 'console',
      event: 'process.start',
      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? 'local',
    })}\n`,
  );
}

/** Next calls this for uncaught server errors (App Router, Next 15). */
export function onRequestError(error: unknown, _request: unknown, context: unknown): void {
  const ctx = (
    typeof context === 'object' && context !== null ? context : {}
  ) as RequestErrorContext;
  const digest = digestOf(error);
  process.stdout.write(
    `${JSON.stringify({
      level: 'error',
      service: 'console',
      event: 'server.request',
      error_name: error instanceof Error ? error.name : 'UnknownError',
      ...(digest === undefined ? {} : { digest }),
      router_kind: ctx.routerKind ?? null,
      route_type: ctx.routeType ?? null,
    })}\n`,
  );
}
