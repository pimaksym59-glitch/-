/**
 * Studio ownership + regression locks (FS9 plan §3.4 and §3.7 I3–I6/I8). The
 * hard rules made checkable at the source level rather than trusted to review:
 * no state lives in Query and Zustand at once, the FS6 relay and the FS7/FS8
 * surfaces are consumed unchanged, and no FS9 writer reaches a foreign key.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageKeys } from '@/entities/image';

const SRC = join(__dirname, '..', '..', 'src');

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

/** These locks are about CODE, not prose: the docstrings deliberately NAME the
 * frozen contracts they consume (dry-run, entity paths), so comments are
 * stripped before matching. */
function code(file: string): string {
  return readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
}

const FS9_SLICES = [
  'widgets/studio',
  'features/regenerate-image',
  'features/upload-references',
  'features/explain-verification',
  'entities/image',
  'entities/location',
];

describe('studio state ownership (plan §3.4)', () => {
  it('explain-verification writes NOTHING to Query (streaming stays transient)', () => {
    for (const file of filesUnder('features/explain-verification')) {
      expect(code(file)).not.toMatch(/setQueryData|invalidateQueries|removeQueries|useQueryClient/);
    }
  });

  it('no FS9 slice puts entity data into the global Zustand store', () => {
    for (const slice of FS9_SLICES) {
      for (const file of filesUnder(slice)) {
        const source = code(file);
        expect(source).not.toMatch(/useUiStore\.setState/);
        expect(source).not.toMatch(/setImage|setLocation|setReferences/);
      }
    }
  });

  it('the assistant-store key namespace never collides with a Query key', () => {
    const panel = readFileSync(
      join(SRC, 'features', 'explain-verification', 'ui', 'ExplainVerificationPanel.tsx'),
      'utf8',
    );
    expect(panel).toMatch(/useAssistantStream\(`image:\$\{image\.id\}`\)/);
    // Query keys are arrays; the assistant key is a string namespace.
    expect(imageKeys.detail('img_tech_1')).toEqual(['images', 'detail', 'img_tech_1']);
  });

  it('the upload machine keeps per-file phases in component state, never in the cache', () => {
    const source = code(
      join(SRC, 'features', 'upload-references', 'model', 'useUploadReferences.ts'),
    );
    expect(source).toMatch(/useState<readonly ReferenceItem\[\]>/);
    expect(source).not.toMatch(/setQueryData/);
    // It may only INVALIDATE the actor record (plan §3.2).
    expect(source).toMatch(/queryKeys\.actor\(/);
    expect(source).not.toMatch(/imageKeys/);
  });

  it('derived projections are stateless (no hooks in the pure renderers)', () => {
    for (const file of [
      join(SRC, 'entities', 'image', 'ui', 'ImageMetaList.tsx'),
      join(SRC, 'widgets', 'studio', 'StudioHonesty.tsx'),
    ]) {
      expect(code(file)).not.toMatch(/useState|useReducer|useRef/);
    }
  });
});

describe('FS6 / FS7 / FS8 regression locks (plan §3.7)', () => {
  it('I3/I6 — no FS9 module touches the AI gateway or the relay directly', () => {
    for (const slice of FS9_SLICES) {
      for (const file of filesUnder(slice)) {
        const source = code(file);
        // Imports, not prose: the panel's visible copy honestly says "dry-run"
        // because that is what the frozen §R10.9 path is — what must never
        // happen is a FS9 module reaching the gateway or its DTOs directly.
        expect(source).not.toMatch(/from '[^']*ai-gateway/);
        expect(source).not.toMatch(/from '[^']*api\/ai\/stream/);
        expect(source).not.toMatch(/StudioDryRun[A-Za-z]*WireDTO/);
      }
    }
    // The ONLY route to the relay is the public streaming hook (FS6 pattern).
    const panel = code(
      join(SRC, 'features', 'explain-verification', 'ui', 'ExplainVerificationPanel.tsx'),
    );
    expect(panel).toMatch(/from '@\/shared\/lib\/stream'/);
  });

  it('I4 — no FS9 module imports the conversation slice', () => {
    for (const slice of FS9_SLICES) {
      for (const file of filesUnder(slice)) {
        expect(code(file)).not.toMatch(/entities\/conversation/);
      }
    }
  });

  it('I5 — no FS9 writer invalidates a knowledge, memory-persona or post key', () => {
    const writers = [
      join(SRC, 'features', 'regenerate-image', 'model', 'useImageIntents.ts'),
      join(SRC, 'features', 'upload-references', 'model', 'useUploadReferences.ts'),
    ];
    for (const file of writers) {
      const source = code(file);
      expect(source).not.toMatch(/queryKeys\.documents|queryKeys\.document\(/);
      expect(source).not.toMatch(/queryKeys\.personas|queryKeys\.persona\(/);
      expect(source).not.toMatch(/queryKeys\.publishedPosts|queryKeys\.needsReview/);
      expect(source).not.toMatch(/documentPaths|personaPaths/);
    }
  });

  it('I6 — the studio never imports the knowledge or memory entity models', () => {
    for (const slice of ['widgets/studio', 'entities/image', 'entities/location']) {
      for (const file of filesUnder(slice)) {
        const source = code(file);
        expect(source).not.toMatch(/entities\/document/);
        expect(source).not.toMatch(/entities\/persona/);
      }
    }
  });

  it('no cross-entity import: `image` and `location` stay independent', () => {
    for (const file of filesUnder('entities/image')) {
      expect(code(file)).not.toMatch(/entities\/(actor|location)/);
    }
    for (const file of filesUnder('entities/location')) {
      expect(code(file)).not.toMatch(/entities\/(actor|image)/);
    }
  });
});
