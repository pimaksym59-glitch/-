/**
 * SSE response helpers shared by both AiGateway implementations. Pure framing
 * only — no timing, no content decisions.
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

/** One SSE frame. `event: null` emits a default `message` frame. */
export function sseFrame(event: string | null, data: string): string {
  const lines = data.split('\n').map((line) => `data: ${line}`);
  return `${event ? `event: ${event}\n` : ''}${lines.join('\n')}\n\n`;
}

export const DONE_FRAME = sseFrame(null, '[DONE]');

/** A complete SSE response from pre-built frames (no artificial pacing). */
export function sseResponse(frames: readonly string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
