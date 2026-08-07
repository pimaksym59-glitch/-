/**
 * Real AiGateway (FS6 default path). A VERBATIM relay over the frozen contract
 * `POST /studio/dry-run` (§R10.9) — the owner's binding conditions apply:
 * NO generation logic here, NO simulated token cadence. Three honest outcomes:
 *  - the upstream ever answers `text/event-stream` (FE-RV-9 assumes it does
 *    NOT today) → its body is piped through byte-for-byte;
 *  - the upstream answers JSON → ONE `result` frame carrying the wire payload
 *    verbatim + `[DONE]` (the client shows ThinkingState until then and
 *    renders the answer in a single append);
 *  - the upstream fails → the upstream status is returned as a plain error
 *    response (openStream raises the matching AppError; Retry-After passes
 *    through). Runtime wire truth is FE-RV-9 — nothing here is live-verified.
 */
import { getServerConfig } from '@/shared/config/server-env';
import type { StudioDryRunResponseWireDTO } from '@/shared/types';
import { DONE_FRAME, SSE_HEADERS, sseFrame, sseResponse } from './sse';
import type { AiGateway, AiStreamRequest } from './types';

function base(): string {
  return getServerConfig().INTERNAL_API_BASE_URL.replace(/\/$/, '');
}

function errorResponse(status: number, message: string, retryAfter?: string | null): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (retryAfter) headers['Retry-After'] = retryAfter;
  return new Response(JSON.stringify({ message }), { status, headers });
}

export const realAiGateway: AiGateway = {
  async stream(
    request: AiStreamRequest,
    cookieHeader: string,
    signal: AbortSignal | null,
  ): Promise<Response> {
    let upstream: Response;
    try {
      upstream = await fetch(`${base()}/studio/dry-run`, {
        method: 'POST',
        headers: { cookie: cookieHeader, 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: request.prompt, model: request.model }),
        cache: 'no-store',
        ...(signal ? { signal } : {}),
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
      return errorResponse(502, 'AI upstream unreachable.');
    }

    if (!upstream.ok) {
      return errorResponse(
        upstream.status,
        `AI upstream responded ${upstream.status}.`,
        upstream.headers.get('retry-after'),
      );
    }

    // A streaming upstream (future backend work, FE-RV-9): pipe VERBATIM.
    const contentType = upstream.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream') && upstream.body) {
      return new Response(upstream.body, { headers: SSE_HEADERS });
    }

    // Non-streaming upstream: one result frame, exactly what the wire said.
    const wire = (await upstream.json()) as StudioDryRunResponseWireDTO;
    return sseResponse([sseFrame('result', JSON.stringify(wire)), DONE_FRAME]);
  },
};
