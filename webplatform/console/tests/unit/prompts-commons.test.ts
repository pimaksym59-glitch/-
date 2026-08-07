/**
 * FS10 T-FS10.1 — the ZERO-commons lock **and** the CHANNEL-FREE lock.
 *
 * `/chat` sits at 178 / 180 kB with 2.0 kB of headroom that webpack returned
 * rather than a lever won, so prompt key/path builders live in their ENTITY
 * slice and `shared/config/query-keys.ts` / `shared/lib/api/endpoints.ts` gain
 * no rows (plan §3.1/§3.2/§6.3.6).
 *
 * The second half is the owner's requirement A: the Prompt Library is the
 * project's first surface that is **not channel-scoped**, because the `prompts`
 * table has no `channel_id`. That must be a structural fact, not a habit — no
 * prompt key, path or fetcher may accept a channel id, so "switching channels
 * changes nothing here" cannot regress silently.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fetchPrompts, fetchPromptVersions, promptKeys, promptPaths } from '@/entities/prompt';
import { queryKeys } from '@/shared/config/query-keys';
import { endpoints } from '@/shared/lib/api';

const SRC = join(__dirname, '..', '..', 'src');
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const commonsKeys = stripComments(
  readFileSync(join(SRC, 'shared', 'config', 'query-keys.ts'), 'utf8'),
);
const commonsEndpoints = stripComments(
  readFileSync(join(SRC, 'shared', 'lib', 'api', 'endpoints.ts'), 'utf8'),
);

describe('prompt commons discipline (plan §3.1/§3.2)', () => {
  it('shared query-keys gains NO prompt builders', () => {
    expect(commonsKeys).not.toMatch(/prompts\s*:/);
    expect(commonsKeys).not.toMatch(/promptVersions|promptsByType/);
    expect(Object.keys(queryKeys)).not.toContain('prompts');
    expect(Object.keys(queryKeys)).not.toContain('promptVersions');
  });

  it('shared endpoints gains NO prompt paths', () => {
    expect(commonsEndpoints).not.toMatch(/prompts/);
    expect(Object.keys(endpoints)).not.toContain('prompts');
  });

  it('prompt keys are namespaced under "prompts" and cannot collide with other entities', () => {
    for (const key of [promptKeys.list(), promptKeys.byType('system'), promptKeys.versions('p1')]) {
      expect(key[0]).toBe('prompts');
    }

    const foreignRoots = new Set<string>(
      [
        queryKeys.documents('ch'),
        queryKeys.personas('ch'),
        queryKeys.actors('ch'),
        queryKeys.publishedPosts('ch'),
        queryKeys.needsReview('ch'),
        queryKeys.jobs('scope', 'ch'),
        queryKeys.analytics('ch'),
      ].map((key) => key[0]),
    );
    expect(foreignRoots.has('prompts')).toBe(false);
  });

  it('the prompt slice never imports the shared key registry (entity-local by design)', () => {
    for (const file of ['hooks.ts', 'keys.ts', 'paths.ts', 'model.ts']) {
      // Comments are stripped: the doc blocks deliberately NAME the commons
      // modules they stay out of (the FS9 studio-commons precedent).
      const source = stripComments(readFileSync(join(SRC, 'entities', 'prompt', file), 'utf8'));
      expect(source).not.toMatch(/shared\/config\/query-keys/);
      expect(source).not.toMatch(/shared\/lib\/api\/endpoints/);
    }
  });
});

describe('prompt surface is CHANNEL-FREE (owner requirement A)', () => {
  it('no prompt query key accepts or contains a channel id', () => {
    // Arity: a channel argument cannot even be passed.
    expect(promptKeys.list).toHaveLength(0);
    expect(promptKeys.byType).toHaveLength(1);
    expect(promptKeys.versions).toHaveLength(1);

    const keys = [
      promptKeys.list(),
      promptKeys.byType('system'),
      promptKeys.versions('p1'),
      // Even if a caller smuggled a channel-shaped string in, it lands in the
      // type/id slot and never becomes a channel dimension.
      promptKeys.byType('ch_tech'),
    ];
    for (const key of keys) {
      expect(key.some((part) => String(part).startsWith('ch_'))).toBe(
        String(key[2] ?? '') === 'ch_tech',
      );
      expect(key.length).toBeLessThanOrEqual(3);
    }
  });

  it('no prompt path builder accepts a channel id, and no path is channel-scoped', () => {
    expect(promptPaths.create).toHaveLength(0);
    expect(promptPaths.versions).toHaveLength(1);
    for (const path of [
      promptPaths.list(),
      promptPaths.list('system'),
      promptPaths.create(),
      promptPaths.versions('p1'),
    ]) {
      expect(path.startsWith('/prompts')).toBe(true);
      expect(path).not.toMatch(/channels?/i);
      expect(path).not.toMatch(/channel_id/);
    }
  });

  it('the fetchers take no channel argument', () => {
    // (type?, signal?) and (id, signal?) — never a channel.
    expect(fetchPrompts.length).toBeLessThanOrEqual(2);
    expect(fetchPromptVersions.length).toBeLessThanOrEqual(2);
    const source = readFileSync(join(SRC, 'entities', 'prompt', 'hooks.ts'), 'utf8');
    expect(source).not.toMatch(/channelId/);
    expect(source).not.toMatch(/forChannelId/);
  });

  it('the prompt slice contains no channel vocabulary at all', () => {
    for (const file of ['hooks.ts', 'keys.ts', 'paths.ts', 'model.ts', 'index.ts']) {
      const source = stripComments(readFileSync(join(SRC, 'entities', 'prompt', file), 'utf8'));
      expect(source).not.toMatch(/channel/i);
    }
  });
});
