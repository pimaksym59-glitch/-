/**
 * AI SSE relay (FS6 T-FS6.1 — the Stage 2 §4 "SSE relay" BFF). POST body
 * `{prompt, model}` → the AiGateway answers as SSE (`chunk`* → `result` →
 * `[DONE]`). This route adds NOTHING to the data — no generation logic, no
 * pacing (owner's FS6 conditions); it only guards the session (SEC-2) and
 * forwards cookies + the abort signal so Stop cancels the upstream work.
 * Replaces the FS1 demo relay (`/api/stream`).
 */
import { resolveServerSession } from '@/shared/lib/auth-gateway';
import { getAiGateway } from '@/shared/lib/ai-gateway';
import { DEFAULT_MODEL_ID, isKnownModel } from '@/shared/config/models';

export const dynamic = 'force-dynamic';

const MAX_PROMPT_LENGTH = 8_000;

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const session = await resolveServerSession(cookieHeader);
  if (!session) return jsonError(401, 'Sign in to use AI.');

  let body: { prompt?: unknown; model?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown; model?: unknown };
  } catch {
    return jsonError(400, 'Invalid request body.');
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return jsonError(400, 'Prompt is required.');
  if (prompt.length > MAX_PROMPT_LENGTH) return jsonError(400, 'Prompt is too long.');
  const model =
    typeof body.model === 'string' && isKnownModel(body.model) ? body.model : DEFAULT_MODEL_ID;

  const gateway = await getAiGateway();
  return gateway.stream({ prompt, model }, cookieHeader, request.signal);
}
