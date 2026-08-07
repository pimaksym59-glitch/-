/**
 * FS14 — source-level locks for the two engineering duties this stage carried
 * (STAGE_FS14_PLAN §1 T-FS14.9 / T-FS14.11).
 *
 * These read CODE, not prose: every file in this project documents the rule it
 * follows, so a naive `toContain` would happily match an explanation instead of
 * an implementation (the FS13 lesson — a lock a comment can satisfy is not a
 * lock). `stripComments` is therefore applied to every source read here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

/** Drop block and line comments so an assertion cannot pass on a doc comment. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('CSP promotion package (T-FS14.11)', () => {
  const config = stripComments(source('next.config.ts'));

  it('still ships REPORT-ONLY — promotion is a runtime decision, not a silent edit', () => {
    expect(config).toContain("key: 'Content-Security-Policy-Report-Only'");
    // The enforced key must not appear in code: enabling it without the
    // FE-RV-17 evidence would be exactly the fabricated gate rule №33 and the
    // honesty rule both forbid.
    expect(config).not.toContain("key: 'Content-Security-Policy'");
  });

  it('keeps the directives that need no runtime evidence to be correct', () => {
    expect(config).toContain("default-src 'self'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("base-uri 'self'");
    expect(config).toContain("form-action 'self'");
    expect(config).toContain("connect-src 'self'");
  });

  it('allows NO external host in any directive (self-hosted fonts, no CDN)', () => {
    const directiveBlock = config.slice(
      config.indexOf('const csp'),
      config.indexOf('const security'),
    );
    expect(directiveBlock).not.toMatch(/https?:\/\//);
  });
});

describe('the observability seam (T-FS14.9, D6 Option A)', () => {
  const route = stripComments(source('src/app/api/telemetry/route.ts'));
  const instrumentation = stripComments(source('src/instrumentation.ts'));

  it('accepts an ALLOWLIST and strips everything else', () => {
    // `.strict()` is what makes the allowlist real: unknown keys are rejected
    // rather than echoed into the platform's logs.
    expect(route).toContain('.strict()');
    expect(route).toContain("kind: z.literal('error')");
    expect(route).toContain('name: z.string()');
    // No field can carry free text from a screen.
    expect(route).not.toContain('message');
    expect(route).not.toContain('stack');
    expect(route).not.toContain('pathname');
  });

  it('never answers with anything but 204 — an endpoint is not an oracle', () => {
    expect(route).toContain('status: 204');
    expect(route).not.toMatch(/status:\s*(400|422|500)/);
  });

  it('aligns with the backend by echoing the correlation header', () => {
    expect(route).toContain('CORRELATION_HEADER');
    expect(route).toContain('request_id');
  });

  it('reports server errors by NAME and digest only', () => {
    expect(instrumentation).toContain('error_name');
    expect(instrumentation).toContain('digest');
    expect(instrumentation).not.toContain('error.message');
    expect(instrumentation).not.toContain('.stack');
  });

  it('ships NO client telemetry module — Gate A refused it on measurement', () => {
    // The client sink cost /billing, /dashboard and /jobs 1 kB each in two
    // independent placements (FS14_REPORT §4). It must not reappear without a
    // fresh measurement, so its absence is asserted rather than remembered.
    expect(() => source('src/shared/lib/observability/sink.ts')).toThrow();
  });
});

describe('progressive disclosure rollout (T-FS14.12)', () => {
  it('reads the experience level through the ONE preferences module', () => {
    for (const file of [
      'src/widgets/inspector/TaskInspector.tsx',
      'src/widgets/inspector/AuditInspector.tsx',
    ]) {
      const code = stripComments(source(file));
      expect(code).toContain("from '@/features/change-settings'");
      expect(code).toContain('useAccountPreferences');
      // No component may touch storage directly (the FS13 single-toucher rule).
      expect(code).not.toContain('localStorage');
    }
  });

  it('reveals only data the screen already holds — no extra request per tier', () => {
    const code = stripComments(source('src/widgets/inspector/TaskInspector.tsx'));
    expect(code).toContain('JSON.stringify(task');
    expect(code).not.toContain('apiFetch');
  });
});
