/**
 * First-party telemetry sink (FS14 T-FS14.9 · Stage 2 §11 · plan §5.2 D6
 * Option A). A console route handler — **not** an `/api/v1` contract endpoint,
 * so no backend change is requested or implied and `endpoints.ts` gains no row.
 *
 * **Why a first-party route instead of a vendor SDK.** A vendor SDK initialises
 * in the app shell, which is commons weight on a route with 0.0 kB of headroom
 * (`/chat` 180 / 180). Behind this handler the vendor is an infrastructure
 * decision — forward the line to stdout today, to a collector tomorrow —
 * without a byte reaching any client bundle.
 *
 * **It has NO client caller today, and that is stated rather than hidden.**
 * Gate A measured a client sink and refused it: it cost `/billing`,
 * `/dashboard` and `/jobs` 1 kB each in two independent placements, with
 * control build C byte-identical once removed. This handler is therefore the
 * declared ingress of the D6 Option A seam — exercised by its own test, ready
 * for the vendor binding — while the live producer of telemetry today is the
 * SERVER hook in `src/instrumentation.ts`. See FS14_REPORT §4.
 *
 * **What it accepts.** Only the four allowlisted fields of `TelemetryEvent`,
 * re-validated here with Zod because a request body is untrusted input even
 * when the only shipped caller is our own sink. Unknown keys are STRIPPED, not
 * echoed: the boundary must not become a way to write arbitrary text into the
 * platform's logs.
 *
 * **What it emits.** One structured JSON line on stdout, the shape the backend
 * uses for its own structured logging (§R12.9) so both sides can be read with
 * the same tooling, carrying the client's `X-Request-Id` when one is present.
 * The response is always `204` and never describes what happened — an endpoint
 * that reports its own validation results is an oracle.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CORRELATION_HEADER } from '@/shared/lib/api';

export const runtime = 'nodejs';

/** Mirrors `TelemetryEvent` exactly. `.strict()` is the point of the schema. */
const telemetrySchema = z
  .object({
    kind: z.literal('error'),
    scope: z.enum(['root', 'workspace', 'platform', 'account']),
    name: z.string().min(1).max(64),
    digest: z.string().max(64).optional(),
  })
  .strict();

/** A boundary event is tiny; anything larger is not ours. */
const MAX_BODY_BYTES = 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const noContent = new NextResponse(null, { status: 204 });

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return noContent;
  }
  if (raw.length > MAX_BODY_BYTES) return noContent;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return noContent;
  }

  const event = telemetrySchema.safeParse(parsedJson);
  if (!event.success) return noContent;

  const requestId = request.headers.get(CORRELATION_HEADER);
  process.stdout.write(
    `${JSON.stringify({
      level: 'error',
      service: 'console',
      event: 'client.boundary',
      request_id: requestId,
      scope: event.data.scope,
      error_name: event.data.name,
      ...(event.data.digest === undefined ? {} : { digest: event.data.digest }),
    })}\n`,
  );

  return noContent;
}
