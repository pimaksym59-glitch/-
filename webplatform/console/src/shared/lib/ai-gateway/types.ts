/**
 * AiGateway seam (FS6 T-FS6.1 — the FS4 AuthGateway pattern applied to AI).
 * SERVER-SIDE ONLY: consumed by the BFF relay route handler, never by client
 * components. The gateway produces a complete SSE `Response`; the relay route
 * returns it verbatim and adds NOTHING — no generation logic, no simulated
 * token cadence (owner's FS6 implementation conditions).
 *
 * Relay SSE protocol consumed by `useAssistantStream`:
 *  - `event: chunk`  data = a text delta (present only when the source truly
 *    chunks — the fixture stream, or a future streaming upstream);
 *  - `event: result` data = JSON `StudioDryRunResponseWireDTO` (authoritative
 *    final payload: output + model + cost);
 *  - `data: [DONE]`  terminator (openStream's STREAM_DONE sentinel).
 */
export interface AiStreamRequest {
  readonly prompt: string;
  readonly model: string;
}

export interface AiGateway {
  /**
   * Run one dry-run generation and answer as an SSE response. `signal` is the
   * client's abort signal — Stop must cancel the upstream work.
   */
  stream(
    request: AiStreamRequest,
    cookieHeader: string,
    signal: AbortSignal | null,
  ): Promise<Response>;
}
