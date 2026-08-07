/**
 * Fixture AiGateway — deterministic dry-run streams for local/ci ONLY (E2E +
 * demo without a live backend). Content is a fixed template (plus an echo of
 * the first prompt line) so journeys assert exact text; the stream is TRULY
 * chunked so the whole streaming machinery — token append, Stop, partial
 * preservation — is exercised end-to-end. The small per-chunk pacing exists
 * ONLY in this stand-in so Stop is reachable in tests; the REAL relay never
 * paces anything (owner's FS6 condition: no simulated generation speed on the
 * live path).
 *
 * KILL-SWITCH (FS4/FS5 triple pattern, guard (b)): importing this module in a
 * staging/production build THROWS at module scope. Guard (a) is the server-env
 * refusal; guard (c) is the static-import grep lock (fixture-integrity tests).
 */
import { getPublicConfig } from '@/shared/config/env';
import type { StudioDryRunResponseWireDTO } from '@/shared/types';
import { DONE_FRAME, SSE_HEADERS, sseFrame } from './sse';
import type { AiGateway, AiStreamRequest } from './types';

{
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
  if (appEnv === 'staging' || appEnv === 'production') {
    throw new Error(
      `AI-FIXTURE INTEGRITY: the fixture AI gateway was imported with NEXT_PUBLIC_APP_ENV="${appEnv}". ` +
        'An AI stand-in must never exist in staging/production builds (FS6 T-FS6.1).',
    );
  }
}

export const FIXTURE_AI_COST_USD = 0.0042;

const FIXTURE_BODY = [
  'Deterministic fixture reply. This text is served by the local/ci AI stand-in — no model was called.',
  '',
  '- The streaming machinery (tokens, Stop, partial output) is exercised for real.',
  '- Costs and the model id round-trip through the same wire shape the live relay uses.',
].join('\n');

/** Deterministic output: fixed body + an echo of the first prompt line. */
export function fixtureOutputFor(prompt: string): string {
  const firstLine = prompt.split('\n', 1)[0]?.trim() ?? '';
  return `${FIXTURE_BODY}\n\n> You asked: ${firstLine}`;
}

/** Word-level chunks so Stop lands mid-stream deterministically. */
export function fixtureChunksFor(prompt: string): readonly string[] {
  const output = fixtureOutputFor(prompt);
  const words = output.split(/(?<=\s)/);
  return words;
}

const CHUNK_PACE_MS = 25;

export const fixtureAiGateway: AiGateway = {
  stream(request: AiStreamRequest, _cookieHeader: string, signal: AbortSignal | null) {
    const encoder = new TextEncoder();
    const chunks = fixtureChunksFor(request.prompt);
    const wire: StudioDryRunResponseWireDTO = {
      output: fixtureOutputFor(request.prompt),
      model: request.model,
      cost_usd: FIXTURE_AI_COST_USD,
    };

    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const stop = (): void => {
          cancelled = true;
        };
        signal?.addEventListener('abort', stop, { once: true });
        try {
          for (const chunk of chunks) {
            if (cancelled || signal?.aborted) return;
            controller.enqueue(encoder.encode(sseFrame('chunk', chunk)));
            // Test-infra pacing (fixture ONLY — see module docstring).
            await new Promise((resolve) => setTimeout(resolve, CHUNK_PACE_MS));
          }
          if (cancelled || signal?.aborted) return;
          controller.enqueue(encoder.encode(sseFrame('result', JSON.stringify(wire))));
          controller.enqueue(encoder.encode(DONE_FRAME));
        } finally {
          signal?.removeEventListener('abort', stop);
          try {
            controller.close();
          } catch {
            // already closed/cancelled
          }
        }
      },
      cancel() {
        cancelled = true;
      },
    });

    return Promise.resolve(new Response(stream, { headers: SSE_HEADERS }));
  },
};
