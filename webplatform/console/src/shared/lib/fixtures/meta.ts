/**
 * Body-meta extraction for the /documents fixture group (FS7) — shared by the
 * BROWSER worker and the NODE test handlers, so it must not import
 * `msw/browser` (its exports map has `node: null` — the FS5 lesson). Only
 * /api/v1/documents* bodies are ever consumed — those paths are ALWAYS
 * answered by the resolver (never passthrough), so the body is read DIRECTLY:
 * `request.clone()` stalls under undici when the original stream stays unread
 * (found while wiring the node handlers), and no replay ever needs the body.
 */
import './guard';
import type { FixtureRequestMeta } from './dataset';

/** FS8: persona mutations need their JSON body echoed by the resolver. Same
 * rule as documents — these paths are ALWAYS answered, never passed through. */
export async function extractPersonaMeta(
  request: Request,
  pathname: string,
): Promise<FixtureRequestMeta | undefined> {
  if (!/^\/api\/v1\/personas\//.test(pathname)) return undefined;
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    return { body: await request.json() };
  } catch {
    return undefined;
  }
}

/**
 * FS9: the actor reference upload (`POST /actors/{id}/references`, §R6.1) is
 * multipart. The resolver ignores the bytes, but the body MUST still be read
 * here — undici stalls when a request stream stays unread on a path that never
 * passes through (the FS7 lesson). Same duck-typing rule for the parsed File.
 */
export async function extractActorReferenceMeta(
  request: Request,
  pathname: string,
): Promise<FixtureRequestMeta | undefined> {
  if (!/^\/api\/v1\/actors\/[^/]+\/references$/.test(pathname)) return undefined;
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) return undefined;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (
      file !== null &&
      typeof file === 'object' &&
      'name' in file &&
      typeof (file as File).name === 'string' &&
      typeof (file as File).size === 'number'
    ) {
      return { filename: (file as File).name, sizeBytes: (file as File).size };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * FS10: `POST /prompts` (a new version, §R10.6) carries a JSON body the
 * resolver must echo. Same rule as documents/personas — `/api/v1/prompts` is
 * ALWAYS answered by the resolver, never passed through, so the body is read
 * directly (a `clone()` stalls under undici — the FS7 lesson).
 */
export async function extractPromptMeta(
  request: Request,
  pathname: string,
): Promise<FixtureRequestMeta | undefined> {
  if (pathname !== '/api/v1/prompts') return undefined;
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    return { body: await request.json() };
  } catch {
    return undefined;
  }
}

export async function extractDocumentMeta(
  request: Request,
  pathname: string,
): Promise<FixtureRequestMeta | undefined> {
  if (!pathname.startsWith('/api/v1/documents')) return undefined;
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      // Duck-typed: the parsed entry may be undici's File while the global is
      // jsdom's (node tests) — `instanceof File` would falsely reject it.
      if (
        file !== null &&
        typeof file === 'object' &&
        'name' in file &&
        typeof (file as File).name === 'string' &&
        typeof (file as File).size === 'number'
      ) {
        return { filename: (file as File).name, sizeBytes: (file as File).size };
      }
      return undefined;
    }
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { channel_id?: string };
      return { channelId: body.channel_id ?? null };
    }
  } catch {
    return undefined;
  }
  return undefined;
}
