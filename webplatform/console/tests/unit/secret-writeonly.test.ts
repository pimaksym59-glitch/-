/**
 * FS12 T-FS12.11 / plan §5.2 D13 — the write-only secret lock.
 *
 * `PUT /api-keys` is the project's first secret-writing surface, so "secrets
 * are write-only" stops being a convention and becomes a mechanism. This file
 * is the mechanism's proof: a source-level lock (the FS4/FS5 kill-switch
 * pattern) plus a shape lock on the VM.
 *
 * What it forbids, concretely: persisting the value anywhere (draft, store,
 * cache, cookie, query key), reading it back, echoing it into a toast or an
 * error, or giving the slot VM a field that could hold one.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapApiKeySlot } from '@/entities/api-key';

const SRC = join(__dirname, '..', '..', 'src');
const read = (...parts: readonly string[]): string => readFileSync(join(SRC, ...parts), 'utf8');
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const rotateModel = stripComments(read('features', 'rotate-key', 'model', 'useRotateKey.ts'));
const rotateDialog = stripComments(read('features', 'rotate-key', 'ui', 'RotateKeyDialog.tsx'));
const keyModel = stripComments(read('entities', 'api-key', 'model.ts'));
const keyHooks = stripComments(read('entities', 'api-key', 'hooks.ts'));
const keyKeys = stripComments(read('entities', 'api-key', 'keys.ts'));
const keyInspector = stripComments(read('widgets', 'inspector', 'KeyInspector.tsx'));

describe('the secret never persists', () => {
  const persistence = [
    'localStorage',
    'sessionStorage',
    'document.cookie',
    'indexedDB',
    'setQueryData',
    'useDraft',
    'persist(',
    'useUiStore',
  ];

  it.each(persistence)('rotate-key never touches %s', (api) => {
    expect(rotateModel).not.toContain(api);
    expect(rotateDialog).not.toContain(api);
  });

  it('the value reaches only the request body', () => {
    expect(rotateModel).toContain('json: { name, value }');
    // Principled rather than arithmetic: the callbacks that run AFTER the
    // request completes — where a leak into a toast, a cache or a log would
    // live — must not mention the value at all.
    const callbacks = rotateModel.slice(
      rotateModel.indexOf('retry: false'),
      rotateModel.indexOf('return {'),
    );
    expect(callbacks).toContain('onSuccess');
    expect(callbacks).toContain('onError');
    expect(callbacks).not.toMatch(/\bvalue\b/);
  });

  it('the returned `rotate` takes the value as an argument and forwards it once', () => {
    expect(rotateModel).toContain('rotate: (name, value, onDone) =>');
    expect(rotateModel).toContain(
      'mutation.mutate(onDone ? { name, value, onDone } : { name, value })',
    );
  });

  it('never echoes the value into a toast or an error', () => {
    const toastBlocks = rotateModel.slice(rotateModel.indexOf('onSuccess'));
    expect(toastBlocks).not.toContain('${value}');
    expect(toastBlocks).not.toContain('value)');
    expect(rotateModel).toContain('error.message');
  });

  it('the dialog clears the field on submit and on close', () => {
    expect(rotateDialog).toContain("setValue('')");
    expect(rotateDialog).toContain('type="password"');
    expect(rotateDialog).toContain('autoComplete="off"');
  });

  it('the dialog never pre-fills the field', () => {
    expect(rotateDialog).not.toContain('defaultValue');
    expect(rotateDialog).toContain("useState('')");
  });
});

describe('the read side cannot carry a secret', () => {
  it('the entity never names a value field', () => {
    for (const source of [keyModel, keyHooks, keyKeys, keyInspector]) {
      expect(source).not.toMatch(/\bsecret\b\s*[:.]/);
      expect(source).not.toMatch(/\bapiKey\b\s*[:.]/);
    }
    // The VM's shape is the lock: no property could hold one.
    const vm = mapApiKeySlot({ name: 'openai', configured: true }, 0);
    expect(Object.keys(vm).sort()).toEqual(['configured', 'id', 'kind', 'label', 'updatedAt']);
  });

  it('never masks a key either — a mask is still key material', () => {
    for (const source of [keyModel, keyInspector]) {
      expect(source).not.toContain('slice(-4)');
      expect(source).not.toContain('•••');
      expect(source).not.toContain('***');
    }
  });

  it('drops any value a wire volunteers', () => {
    const vm = mapApiKeySlot({ name: 'openai', value: 'sk-live-123' } as never, 0);
    expect(JSON.stringify(vm)).not.toContain('sk-live-123');
  });

  it('no query key can contain a secret (the cache holds identity only)', () => {
    expect(keyKeys).toContain("['api-keys', 'list']");
    expect(keyKeys).not.toContain('value');
  });
});

describe('the fixture stores and echoes nothing', () => {
  it('answers 204 with no body and keeps no state', () => {
    const dataset = stripComments(read('shared', 'lib', 'fixtures', 'dataset.ts'));
    const platformBlock = dataset.slice(dataset.indexOf('function resolvePlatform'));
    expect(platformBlock).toContain("if (p === '/api-keys' && method === 'PUT')");
    expect(platformBlock).toContain('status: 204, body: null');
    // No mutable store is written on the api-keys path.
    expect(platformBlock).not.toContain('API_KEY_SLOTS[');
    expect(platformBlock).not.toContain('.push(');
  });
});
