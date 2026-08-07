/**
 * FS10 T-FS10.10 — `entities/prompt` mappers and selectors.
 *
 * The assertions encode the plan's honesty rules, not just behaviour: an
 * unrecognised `type` survives by its raw value, the author stays an id, and
 * the ViewModel has **no** activation or variables field to render from.
 */
import { describe, expect, it } from 'vitest';
import {
  filterPromptGroups,
  findGroup,
  findVersion,
  groupPromptsByType,
  mapPrompt,
  previousVersion,
  promptTypeLabel,
  sortVersions,
  type PromptWireDTO,
} from '@/entities/prompt';

const row = (over: Partial<PromptWireDTO> = {}): PromptWireDTO => ({
  id: 'prm_1',
  type: 'system',
  text: 'line one',
  version: 1,
  author: 'usr_owner',
  created_at: '2026-07-01T10:00:00Z',
  ...over,
});

describe('mapPrompt (plan §5.2 D1/D2/D5)', () => {
  it('maps the wire fields and humanises a known type', () => {
    const vm = mapPrompt(row({ model: 'claude-opus-4-8', result: 'ok' }));
    expect(vm).toMatchObject({
      id: 'prm_1',
      type: 'system',
      typeLabel: 'System',
      typeKnown: true,
      version: 1,
      authorId: 'usr_owner',
      model: 'claude-opus-4-8',
      result: 'ok',
    });
  });

  it('keeps an UNRECOGNISED type as its raw value instead of coercing it', () => {
    const vm = mapPrompt(row({ type: 'weekly_digest' }));
    expect(vm.type).toBe('weekly_digest');
    expect(vm.typeLabel).toBe('weekly_digest');
    expect(vm.typeKnown).toBe(false);
    expect(promptTypeLabel('weekly_digest')).toBe('weekly_digest');
  });

  it('never produces an activation state or a variables count', () => {
    const vm = mapPrompt(row());
    expect(Object.keys(vm)).not.toContain('active');
    expect(Object.keys(vm)).not.toContain('isActive');
    expect(Object.keys(vm)).not.toContain('variables');
    expect(Object.keys(vm)).not.toContain('variablesCount');
    // …and no channel dimension leaks in (owner requirement A).
    expect(Object.keys(vm)).not.toContain('channelId');
  });

  it('absent optional fields become null, never a fabricated default', () => {
    const vm = mapPrompt({ id: 'p', type: 'other', text: 't', version: 2 });
    expect(vm.authorId).toBeNull();
    expect(vm.model).toBeNull();
    expect(vm.result).toBeNull();
    expect(vm.createdAt).toBeNull();
  });
});

describe('grouping and selection', () => {
  const rows = [
    row({ id: 'a1', type: 'system', version: 1, created_at: '2026-07-01T10:00:00Z' }),
    row({ id: 'a3', type: 'system', version: 3, created_at: '2026-07-20T10:00:00Z' }),
    row({ id: 'a2', type: 'system', version: 2, created_at: '2026-07-10T10:00:00Z' }),
    row({ id: 'b1', type: 'image', version: 1, text: 'photoreal' }),
    row({ id: 'z1', type: 'weekly_digest', version: 1, text: 'five bullets' }),
  ].map(mapPrompt);

  it('groups by type, newest version first, and puts unknown types last', () => {
    const groups = groupPromptsByType(rows);
    expect(groups.map((g) => g.type)).toEqual(['system', 'image', 'weekly_digest']);
    const system = groups[0];
    expect(system?.versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(system?.latest.version).toBe(3);
    expect(system?.versionCount).toBe(3);
    expect(groups[2]?.known).toBe(false);
  });

  it('sortVersions breaks version ties by created_at, newest first', () => {
    const tied = [
      mapPrompt(row({ id: 'x', version: 2, created_at: '2026-07-01T00:00:00Z' })),
      mapPrompt(row({ id: 'y', version: 2, created_at: '2026-07-05T00:00:00Z' })),
    ];
    expect(sortVersions(tied).map((v) => v.id)).toEqual(['y', 'x']);
  });

  it('findGroup / findVersion / previousVersion walk the chain', () => {
    const groups = groupPromptsByType(rows);
    const system = findGroup(groups, 'system');
    if (!system) throw new Error('the system group must exist');
    expect(findGroup(groups, null)).toBeNull();
    expect(findGroup(groups, 'nope')).toBeNull();
    // No version in the URL ⇒ the newest.
    expect(findVersion(system, null)?.version).toBe(3);
    expect(findVersion(system, 2)?.version).toBe(2);
    expect(findVersion(system, 99)).toBeNull();
    expect(previousVersion(system, 3)?.version).toBe(2);
    expect(previousVersion(system, 1)).toBeNull();
  });

  it('filterPromptGroups filters the LOADED list by label, type, text or model', () => {
    const groups = groupPromptsByType(rows);
    expect(filterPromptGroups(groups, '').length).toBe(3);
    expect(filterPromptGroups(groups, 'photoreal').map((g) => g.type)).toEqual(['image']);
    expect(filterPromptGroups(groups, 'SYSTEM').map((g) => g.type)).toEqual(['system']);
    expect(filterPromptGroups(groups, 'weekly').map((g) => g.type)).toEqual(['weekly_digest']);
    expect(filterPromptGroups(groups, 'nothing-matches')).toEqual([]);
  });
});
