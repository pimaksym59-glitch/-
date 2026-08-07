/**
 * AiGateway (FS6 T-FS6.1). Locks the owner's binding streaming conditions:
 * the REAL gateway is a verbatim relay (no generation logic, no pacing — a
 * JSON upstream becomes exactly ONE result frame; an SSE upstream is piped
 * byte-for-byte; errors pass the upstream status through), the fixture is
 * deterministic and kill-switched, and no src/ module imports the fixture
 * statically (grep lock, FS4/FS5 pattern).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFrame, STREAM_DONE, type StreamEvent } from '@/shared/lib/stream';

const ENV_KEY = 'NEXT_PUBLIC_APP_ENV';
const originalEnv = process.env[ENV_KEY];

afterEach(() => {
  if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env[ENV_KEY] = originalEnv;
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function readSse(response: Response): Promise<readonly StreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n\n')
    .map((frame) => parseFrame(frame))
    .filter((event): event is StreamEvent => event !== null);
}

describe('fixture AiGateway (local/ci only)', () => {
  it('streams deterministic chunks, then the wire result, then [DONE]', async () => {
    process.env[ENV_KEY] = 'local';
    vi.resetModules();
    const { fixtureAiGateway, fixtureOutputFor, FIXTURE_AI_COST_USD } = await import(
      '@/shared/lib/ai-gateway/fixture'
    );
    const response = await fixtureAiGateway.stream(
      { prompt: 'Hello fixture', model: 'claude-opus-4-8' },
      '',
      null,
    );
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    const events = await readSse(response);

    const chunks = events.filter((e) => e.event === 'chunk');
    const result = events.find((e) => e.event === 'result');
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.map((c) => c.data).join('')).toBe(fixtureOutputFor('Hello fixture'));
    expect(JSON.parse(result?.data ?? '{}')).toEqual({
      output: fixtureOutputFor('Hello fixture'),
      model: 'claude-opus-4-8',
      cost_usd: FIXTURE_AI_COST_USD,
    });
    expect(events.at(-1)?.data).toBe(STREAM_DONE);
    expect(fixtureOutputFor('Hello fixture')).toContain('> You asked: Hello fixture');
  });

  it('KILL-SWITCH: importing the fixture in production/staging THROWS', async () => {
    for (const env of ['production', 'staging']) {
      process.env[ENV_KEY] = env;
      vi.resetModules();
      await expect(import('@/shared/lib/ai-gateway/fixture')).rejects.toThrow(
        /AI-FIXTURE INTEGRITY/,
      );
    }
  });

  it('GREP LOCK: no src/ module statically imports the AI fixture', () => {
    const SRC = join(__dirname, '..', '..', 'src');
    const GATEWAY_DIR = ['shared', 'lib', 'ai-gateway'].join(sep);
    const STATIC_IMPORT =
      /(?:^|\n)\s*(?:import|export)[^;]*?from\s+['"]@\/shared\/lib\/ai-gateway\/fixture['"]/;

    function* walk(dir: string): Generator<string> {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) yield* walk(full);
        else yield full;
      }
    }

    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (rel.startsWith(GATEWAY_DIR)) continue; // internal wiring is legal
      if (STATIC_IMPORT.test(readFileSync(file, 'utf8'))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

describe('real AiGateway — VERBATIM relay (owner condition 2)', () => {
  it('a JSON (non-streaming) upstream becomes exactly ONE result frame + [DONE] — no chunk cadence', async () => {
    process.env[ENV_KEY] = 'local';
    vi.resetModules();
    const wire = { output: 'Upstream answer.', model: 'claude-opus-4-8', cost_usd: 0.01 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(wire), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const { realAiGateway } = await import('@/shared/lib/ai-gateway/real');
    const response = await realAiGateway.stream(
      { prompt: 'q', model: 'claude-opus-4-8' },
      'session=x',
      null,
    );
    const events = await readSse(response);

    expect(events.filter((e) => e.event === 'chunk')).toEqual([]); // no simulated tokens
    expect(JSON.parse(events.find((e) => e.event === 'result')?.data ?? '{}')).toEqual(wire);
    expect(events.at(-1)?.data).toBe(STREAM_DONE);

    // The upstream call is the frozen contract endpoint with cookies forwarded.
    const call = vi.mocked(fetch).mock.calls[0];
    expect(String(call?.[0])).toContain('/studio/dry-run');
    expect((call?.[1]?.headers as Record<string, string>).cookie).toBe('session=x');
  });

  it('an SSE upstream is piped through byte-for-byte (verbatim)', async () => {
    process.env[ENV_KEY] = 'local';
    vi.resetModules();
    const upstreamBody = 'event: whatever\ndata: upstream-owns-this\n\n';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(upstreamBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    );
    const { realAiGateway } = await import('@/shared/lib/ai-gateway/real');
    const response = await realAiGateway.stream({ prompt: 'q', model: 'm' }, '', null);
    expect(await response.text()).toBe(upstreamBody);
  });

  it('an upstream failure passes the status through (429 keeps Retry-After)', async () => {
    process.env[ENV_KEY] = 'local';
    vi.resetModules();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'slow down' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '30' },
        }),
      ),
    );
    const { realAiGateway } = await import('@/shared/lib/ai-gateway/real');
    const response = await realAiGateway.stream({ prompt: 'q', model: 'm' }, '', null);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
  });
});
