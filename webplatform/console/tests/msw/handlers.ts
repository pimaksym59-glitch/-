/**
 * MSW handlers (Stage 2 §12). Deterministic fixtures mirroring the frozen
 * contract shapes (API_SPEC.md). FS1 covers the infrastructure surface;
 * per-endpoint handlers grow with their slices.
 */
import { http, HttpResponse, passthrough } from 'msw';
import { resolveFixture } from '@/shared/lib/fixtures/dataset';

const API = 'http://localhost/api/v1';
/** BFF handlers (FS4) — path-only matchers (the client fetches relative URLs). */
const BFF = '/api/auth';

const TEST_SESSION = {
  userId: 'usr_test',
  email: 'test@console.local',
  displayName: 'Test User',
  role: 'owner',
  mfaEnabled: false,
} as const;

export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(TEST_SESSION)),

  // FS4 BFF auth surface (deterministic; mirrors the handler contract).
  http.post(`${BFF}/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'test@console.local' && body.password === 'correct-password') {
      return HttpResponse.json(TEST_SESSION, { status: 200 });
    }
    if (body.email === 'ratelimited@console.local') {
      return HttpResponse.json(
        { message: 'Too many attempts. Try again shortly.' },
        { status: 429, headers: { 'retry-after': '30' } },
      );
    }
    return HttpResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
  }),
  http.post(`${BFF}/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BFF}/me`, () => HttpResponse.json(TEST_SESSION)),

  http.get(`${API}/health`, () =>
    HttpResponse.json({
      overall: 'healthy',
      probes: [{ name: 'api', state: 'healthy' }],
    }),
  ),

  http.get(`${API}/boom`, () => HttpResponse.json({ message: 'Kaboom' }, { status: 503 })),

  // SSE fixture for openStream tests.
  http.get('http://localhost/api/stream-test', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: Hello\n\n'));
        controller.enqueue(encoder.encode('data:  world\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  }),

  // FS6 — the BFF AI relay, PATH-ONLY: deterministic chunked SSE built from
  // the same fixture content the server gateway serves (no pacing in tests).
  http.post('/api/ai/stream', async ({ request }) => {
    const body = (await request.json()) as { prompt?: string; model?: string };
    const { fixtureOutputFor, FIXTURE_AI_COST_USD } = await import(
      '@/shared/lib/ai-gateway/fixture'
    );
    const output = fixtureOutputFor(body.prompt ?? '');
    const model = body.model ?? 'claude-opus-4-8';
    const half = Math.ceil(output.length / 2);
    const frames = [
      `event: chunk\n${output
        .slice(0, half)
        .split('\n')
        .map((l) => `data: ${l}`)
        .join('\n')}\n\n`,
      `event: chunk\n${output
        .slice(half)
        .split('\n')
        .map((l) => `data: ${l}`)
        .join('\n')}\n\n`,
      `event: result\ndata: ${JSON.stringify({ output, model, cost_usd: FIXTURE_AI_COST_USD })}\n\n`,
      'data: [DONE]\n\n',
    ];
    return new HttpResponse(frames.join(''), {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }),

  // FS5 — the /api/v1 data surface, PATH-ONLY matchers (FS4 lesson: absolute
  // URLs did not match relative fetches) backed by the SAME deterministic
  // dataset the server branch and the browser worker use. Registered LAST so
  // the specific handlers above keep precedence. FS7 adds PUT/DELETE (the
  // /documents group) and the body-meta extraction the pure resolver needs.
  ...(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((method) => {
    const register = {
      GET: http.get,
      POST: http.post,
      PUT: http.put,
      PATCH: http.patch,
      DELETE: http.delete,
    }[method];
    return register('/api/v1/*', async ({ request }) => {
      const url = new URL(request.url);
      const {
        extractActorReferenceMeta,
        extractDocumentMeta,
        extractPersonaMeta,
        extractPromptMeta,
      } = await import('@/shared/lib/fixtures/meta');
      const meta =
        (await extractDocumentMeta(request, url.pathname)) ??
        (await extractPersonaMeta(request, url.pathname)) ??
        (await extractActorReferenceMeta(request, url.pathname)) ??
        (await extractPromptMeta(request, url.pathname));
      const hit = resolveFixture(method, url.pathname + url.search, 'default', meta);
      if (!hit) return passthrough();
      if (hit.status === 204) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json(hit.body as Record<string, unknown> | unknown[], {
        status: hit.status,
      });
    });
  }),
];
