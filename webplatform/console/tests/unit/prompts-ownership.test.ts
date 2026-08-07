/**
 * Prompt Library ownership + regression locks (FS10 plan §3.4 and §3.7 I3–I8),
 * plus the owner's **requirement B**: because this is the project's first
 * platform-wide surface, its lack of influence on Dashboard, Knowledge, Memory,
 * Studio and Chat is proved at the source level — in BOTH directions — to the
 * FS8/FS9 evidence standard.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { promptKeys } from '@/entities/prompt';

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

/** Locks are about CODE, not prose: docstrings deliberately name the frozen
 *  contracts and the neighbouring screens they stay out of. */
function code(file: string): string {
  return readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
}

const FS10_SLICES = [
  'widgets/prompts',
  'features/manage-prompt',
  'features/test-prompt',
  'entities/prompt',
];

const FS10_FILES = [
  ...FS10_SLICES.flatMap(filesUnder),
  join(SRC, 'widgets', 'inspector', 'PromptInspector.tsx'),
];

describe('prompt state ownership (plan §3.4)', () => {
  it('test-prompt writes NOTHING to Query (streaming stays transient)', () => {
    for (const file of filesUnder('features/test-prompt')) {
      expect(code(file)).not.toMatch(/setQueryData|invalidateQueries|removeQueries|useQueryClient/);
    }
  });

  it('no FS10 slice puts entity data into the global Zustand store', () => {
    for (const file of FS10_FILES) {
      const source = code(file);
      expect(source).not.toMatch(/useUiStore/);
      expect(source).not.toMatch(/setPrompt|setVersions/);
    }
  });

  it('the assistant-store key namespace never collides with a Query key', () => {
    const panel = readFileSync(
      join(SRC, 'features', 'test-prompt', 'ui', 'TestPromptPanel.tsx'),
      'utf8',
    );
    expect(panel).toMatch(/useAssistantStream\(`prompt:\$\{version\.id\}`\)/);
    // Query keys are arrays; the assistant key is a string namespace.
    expect(promptKeys.versions('prm_system_3')).toEqual(['prompts', 'versions', 'prm_system_3']);
  });

  it('the draft module is the ONLY toucher of storage (the FS6 repository rule)', () => {
    const draft = code(join(SRC, 'features', 'manage-prompt', 'model', 'promptDraft.ts'));
    expect(draft).toMatch(/createPersistStore/);
    for (const file of FS10_FILES) {
      if (file.endsWith('promptDraft.ts')) continue;
      const source = code(file);
      expect(source).not.toMatch(/shared\/lib\/persist/);
      expect(source).not.toMatch(/localStorage/);
    }
  });

  it('the draft never mirrors server state (no Query access from the draft owner)', () => {
    const draft = code(join(SRC, 'features', 'manage-prompt', 'model', 'promptDraft.ts'));
    expect(draft).not.toMatch(/useQuery|queryClient|promptKeys/);
  });

  it('derived renderers are stateless (no hooks in the pure ones)', () => {
    for (const file of [
      join(SRC, 'widgets', 'prompts', 'PromptsHonesty.tsx'),
      join(SRC, 'widgets', 'prompts', 'PromptDiff.tsx'),
    ]) {
      expect(code(file)).not.toMatch(/useState|useReducer|useEffect/);
    }
  });
});

describe('FS5–FS9 regression locks (plan §3.7 I3–I6)', () => {
  it('I3/I6 — no FS10 module touches the AI gateway or the relay directly', () => {
    for (const file of FS10_FILES) {
      const source = code(file);
      expect(source).not.toMatch(/from '[^']*ai-gateway/);
      expect(source).not.toMatch(/from '[^']*api\/ai\/stream/);
      expect(source).not.toMatch(/StudioDryRun[A-Za-z]*WireDTO/);
    }
    // The ONLY route to the relay is the public streaming hook (FS6 pattern).
    expect(code(join(SRC, 'features', 'test-prompt', 'ui', 'TestPromptPanel.tsx'))).toMatch(
      /from '@\/shared\/lib\/stream'/,
    );
  });

  it('I4 — no FS10 module imports the conversation slice or persist directly', () => {
    for (const file of FS10_FILES) {
      expect(code(file)).not.toMatch(/entities\/conversation/);
    }
  });

  it('I5 — the ONE FS10 writer invalidates prompt keys only', () => {
    const writer = code(
      join(SRC, 'features', 'manage-prompt', 'model', 'useCreatePromptVersion.ts'),
    );
    expect(writer).toMatch(/promptKeys\.list\(\)/);
    expect(writer).not.toMatch(/queryKeys\./);
    expect(writer).not.toMatch(/imageKeys|locationKeys/);
    expect(writer).not.toMatch(/documentPaths|personaPaths|actorPaths|imagePaths/);
  });
});

/* ---------------------------------------------------------------------------
 * Owner requirement B — no cross-scope ownership. The Prompt Library is
 * platform-wide; the five channel-scoped screens must be provably unaffected,
 * and must provably not depend on it either.
 * ------------------------------------------------------------------------- */

const PROTECTED_SURFACES: Readonly<Record<string, readonly string[]>> = {
  Dashboard: ['widgets/dashboard', 'features/review-post', 'entities/analytics'],
  Chat: [
    'widgets/chat',
    'features/send-message',
    'features/insert-to-channel',
    'entities/conversation',
  ],
  Knowledge: [
    'widgets/knowledge',
    'features/add-source',
    'features/ask-document',
    'entities/document',
  ],
  Memory: [
    'widgets/memory',
    'features/edit-persona',
    'features/explain-style',
    'entities/persona',
    'entities/actor',
  ],
  Studio: [
    'widgets/studio',
    'features/regenerate-image',
    'features/upload-references',
    'features/explain-verification',
    'entities/image',
    'entities/location',
  ],
};

describe('requirement B — the platform-wide surface owns nothing channel-scoped', () => {
  it('no FS10 module reads the active channel, its cookie or a channel-keyed key', () => {
    for (const file of [
      ...FS10_FILES,
      join(SRC, 'app', '(workspace)', 'prompts', '[[...path]]', 'page.tsx'),
    ]) {
      const source = code(file);
      expect(source).not.toMatch(/selectActiveChannel|activeChannelId|CHANNEL_COOKIE/);
      expect(source).not.toMatch(/forChannelId/);
      expect(source).not.toMatch(/entities\/channel/);
    }
  });

  it('the RSC page fetches /prompts only — no /channels round-trip', () => {
    const page = code(join(SRC, 'app', '(workspace)', 'prompts', '[[...path]]', 'page.tsx'));
    expect(page).toMatch(/serverApiOrNull<readonly PromptWireDTO\[\]>\('\/prompts'/);
    expect(page).not.toMatch(/'\/channels'/);
  });

  it('no FS10 module imports any Dashboard / Chat / Knowledge / Memory / Studio slice', () => {
    for (const [surface, slices] of Object.entries(PROTECTED_SURFACES)) {
      for (const file of FS10_FILES) {
        const source = code(file);
        for (const slice of slices) {
          expect(
            source.includes(`@/${slice}`),
            `${file} must not import ${slice} (${surface})`,
          ).toBe(false);
        }
      }
    }
  });

  it('no Dashboard / Chat / Knowledge / Memory / Studio module imports the prompt surface', () => {
    for (const [surface, slices] of Object.entries(PROTECTED_SURFACES)) {
      for (const slice of slices) {
        for (const file of filesUnder(slice)) {
          const source = code(file);
          for (const fs10 of [
            '@/entities/prompt',
            '@/features/manage-prompt',
            '@/features/test-prompt',
            '@/widgets/prompts',
          ]) {
            expect(source.includes(fs10), `${file} (${surface}) must not import ${fs10}`).toBe(
              false,
            );
          }
        }
      }
    }
  });

  it('no FS10 query key can ever be invalidated by a channel switch', () => {
    // A channel switch re-scopes by KEY: every channel-scoped key carries the
    // channel id. No prompt key does, so no prompt query participates.
    for (const key of [promptKeys.list(), promptKeys.byType('system'), promptKeys.versions('p')]) {
      expect(key.every((part) => !String(part).startsWith('ch_'))).toBe(true);
    }
    const view = code(join(SRC, 'widgets', 'prompts', 'PromptLibraryView.tsx'));
    expect(view).not.toMatch(/useChannels|channelId/);
  });

  it('the palette’s Prompts group is channel-free while its neighbours are not', () => {
    const palette = code(join(SRC, 'widgets', 'command-palette', 'CommandPalette.tsx'));
    // The prompts query keys on promptKeys.list() — no activeChannelId anywhere
    // in its enabled-condition, unlike the knowledge/memory/images groups.
    expect(palette).toMatch(/queryKey: promptKeys\.list\(\)/);
    expect(palette).toMatch(/enabled: mode === 'search',\s*\n\s*staleTime: PROMPT_STALE_MS/);
  });
});
