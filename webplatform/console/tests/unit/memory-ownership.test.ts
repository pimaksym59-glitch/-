/**
 * Memory ownership locks (FS8 plan §3.4 + §3.7 I8). The hard rule: **no state
 * is owned by TanStack Query and Zustand at the same time.** Server data lives
 * in Query, streamed tokens live in the transient assistant store, shareable UI
 * state lives in the URL — and these tests make that checkable at the source
 * level rather than trusting review.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/shared/config/query-keys';

const SRC = join(__dirname, '..', '..', 'src');

function read(...segments: string[]): string {
  return readFileSync(join(SRC, ...segments), 'utf8');
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  };
  walk(join(SRC, dir));
  return out;
}

const FS8_SLICES = [
  'widgets/memory',
  'features/edit-persona',
  'features/explain-style',
  'entities/persona',
  'entities/actor',
];

describe('memory state ownership (plan §3.4)', () => {
  it('explain-style writes NOTHING to Query (streaming stays transient)', () => {
    for (const file of filesUnder('features/explain-style')) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/setQueryData|invalidateQueries|removeQueries|useQueryClient/);
    }
  });

  it('no FS8 slice puts memory data into the global Zustand store', () => {
    for (const slice of FS8_SLICES) {
      for (const file of filesUnder(slice)) {
        const source = readFileSync(file, 'utf8');
        // The global UI store may only be READ for the active channel/theme —
        // never written with entity data, and never used as a data cache.
        expect(source).not.toMatch(/useUiStore\.setState/);
        expect(source).not.toMatch(/setPersona|setActor|setMemory/);
      }
    }
  });

  it('the assistant-store key namespace never collides with a Query key', () => {
    // explain-style keys its transient slice `persona:<id>`; Query keys are
    // arrays beginning with a resource name — the two namespaces cannot meet.
    const panel = read('features', 'explain-style', 'ui', 'ExplainStylePanel.tsx');
    expect(panel).toMatch(/useAssistantStream\(`persona:\$\{persona\.id\}`\)/);
    expect(queryKeys.persona('p1')[0]).toBe('personas');
    expect(queryKeys.personas('ch')[0]).toBe('personas');
    expect(String(queryKeys.persona('p1'))).not.toContain('persona:p1');
  });

  it('StyleFeatureList is a pure projection — no state, no fetching', () => {
    const source = read('entities', 'persona', 'ui', 'StyleFeatureList.tsx');
    expect(source).not.toMatch(/useState|useEffect|useQuery|useRef/);
  });

  it('memory keys stay distinct from knowledge keys (Memory ≠ Knowledge)', () => {
    expect(queryKeys.personas('ch')[0]).toBe('personas');
    expect(queryKeys.actors('ch')[0]).toBe('actors');
    expect(queryKeys.documents('ch')[0]).toBe('documents');
    // Content memory reuses the posts resource on purpose (§R9.1) but has its
    // own scope segment, so a posts invalidation covers it without collision.
    expect(queryKeys.publishedPosts('ch')).toEqual(['posts', 'published', 'ch']);
  });
});

describe('FS6/FS7 regression guarantees (plan §3.7)', () => {
  it('I4 — no FS8 module imports the conversation slice', () => {
    for (const slice of FS8_SLICES) {
      for (const file of filesUnder(slice)) {
        expect(readFileSync(file, 'utf8')).not.toMatch(/entities\/conversation/);
      }
    }
  });

  it('I6 — FS8 never IMPORTS the AI or knowledge seams (prose precedents are fine)', () => {
    // The invariant is about code reaching a seam, so it is asserted against
    // import statements — a docstring may legitimately cite `documentPaths`
    // as the precedent this stage followed.
    const IMPORTS = /(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+['"]([^'"]+)['"]/g;
    for (const slice of FS8_SLICES) {
      for (const file of filesUnder(slice)) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(IMPORTS)) {
          const specifier = match[1] ?? '';
          // The relay is reached ONLY through the public streaming hook.
          expect(specifier).not.toMatch(/ai-gateway/);
          // Knowledge seams stay knowledge's own.
          expect(specifier).not.toMatch(/entities\/document/);
        }
        // …and no FS8 module names an AI wire DTO at all.
        expect(source).not.toMatch(/StudioDryRun/);
      }
    }
  });

  it('I5 — knowledge query keys keep their exact shapes', () => {
    expect(queryKeys.documents('ch')).toEqual(['documents', 'list', 'ch']);
    expect(queryKeys.document('d1')).toEqual(['documents', 'detail', 'd1']);
    expect(queryKeys.documentVersions('d1')).toEqual(['documents', 'versions', 'd1']);
  });

  it('I5 — no FS8 mutation invalidates a documents key', () => {
    for (const slice of ['features/edit-persona', 'widgets/memory']) {
      for (const file of filesUnder(slice)) {
        expect(readFileSync(file, 'utf8')).not.toMatch(/queryKey: \['documents'/);
      }
    }
  });
});
