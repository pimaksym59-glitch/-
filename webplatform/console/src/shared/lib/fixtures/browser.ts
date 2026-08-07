/**
 * Browser MSW worker over the SAME dataset (FS5 T-FS5.1) — local/ci only
 * (guard.ts throws otherwise; this module is only ever lazy-imported behind
 * the env check in FixtureBoot). Intercepts the client's relative
 * `/api/v1/*` calls so entity hooks run against deterministic data with no
 * live backend. Unmatched requests pass through untouched.
 */
import './guard';
import { http, HttpResponse, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';
import { FIXTURE_SCENARIO_COOKIE, parseScenario } from './guard';
import { resolveFixture } from './dataset';
import {
  extractActorReferenceMeta,
  extractDocumentMeta,
  extractPersonaMeta,
  extractPromptMeta,
} from './meta';

function scenarioFromDocument(): 'default' | 'empty' {
  const match = /(?:^|;\s*)onyx-fixture-scenario=([^;]+)/.exec(document.cookie);
  return parseScenario(match?.[1]);
}

function handle(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const meta =
      (await extractDocumentMeta(request, url.pathname)) ??
      (await extractPersonaMeta(request, url.pathname)) ??
      (await extractActorReferenceMeta(request, url.pathname)) ??
      (await extractPromptMeta(request, url.pathname));
    const hit = resolveFixture(method, url.pathname + url.search, scenarioFromDocument(), meta);
    if (!hit) return passthrough();
    if (hit.status === 204) return new HttpResponse(null, { status: 204 });
    return HttpResponse.json(hit.body as Record<string, unknown> | unknown[], {
      status: hit.status,
    });
  };
}

export const fixtureWorker = setupWorker(
  http.get('/api/v1/*', handle('GET')),
  http.post('/api/v1/*', handle('POST')),
  http.put('/api/v1/*', handle('PUT')),
  http.patch('/api/v1/*', handle('PATCH')),
  http.delete('/api/v1/*', handle('DELETE')),
);

export async function startFixtureWorker(): Promise<void> {
  await fixtureWorker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

// Re-export for tests/tools that need the cookie name without deep imports.
export { FIXTURE_SCENARIO_COOKIE };
