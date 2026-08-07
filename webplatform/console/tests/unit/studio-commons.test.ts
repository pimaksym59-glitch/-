/**
 * FS9 T-FS9.1 — the ZERO-commons lock. `/chat` sits at 179 / 180 kB and the
 * FS8 offload lever is spent, so FS9's answer is structural: image and
 * location query keys live in their ENTITY slices and `shared/config/query-keys.ts`
 * gains no rows (plan §3.1/§3.2/§6.3.6). These tests fail if that drifts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageKeys } from '@/entities/image';
import { locationKeys } from '@/entities/location';
import { queryKeys } from '@/shared/config/query-keys';

const SRC = join(__dirname, '..', '..', 'src');
const commonsKeys = readFileSync(join(SRC, 'shared', 'config', 'query-keys.ts'), 'utf8');
// Strip comments: the pointer note deliberately NAMES the entity-local modules.
const commonsCode = commonsKeys.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('studio commons discipline (plan §3.1/§3.2)', () => {
  it('shared query-keys gains NO image or location builders', () => {
    expect(commonsCode).not.toMatch(/images\s*:/);
    expect(commonsCode).not.toMatch(/imageHistory|imageSimilarity|locations\s*:/);
    expect(Object.keys(queryKeys)).not.toContain('images');
    expect(Object.keys(queryKeys)).not.toContain('locations');
  });

  it('image keys are namespaced under "images" and cannot collide with other entities', () => {
    const keys = [
      imageKeys.list('ch'),
      imageKeys.detail('i'),
      imageKeys.history('i'),
      imageKeys.similarity('i'),
    ];
    for (const key of keys) expect(key[0]).toBe('images');

    const foreignRoots = new Set<string>(
      [
        queryKeys.documents('ch'),
        queryKeys.personas('ch'),
        queryKeys.actors('ch'),
        queryKeys.publishedPosts('ch'),
        queryKeys.needsReview('ch'),
        queryKeys.jobs('scope', 'ch'),
      ].map((key) => key[0]),
    );
    expect(foreignRoots.has('images')).toBe(false);
    expect(foreignRoots.has('locations')).toBe(false);
    expect(locationKeys.list('ch')[0]).toBe('locations');
  });

  it('studio slices never import the shared key registry (entity-local by design)', () => {
    for (const file of [
      join(SRC, 'entities', 'image', 'hooks.ts'),
      join(SRC, 'entities', 'location', 'hooks.ts'),
    ]) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/shared\/config\/query-keys/);
    }
  });
});
