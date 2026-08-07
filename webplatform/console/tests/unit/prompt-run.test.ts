/**
 * FS10 T-FS10.10 — the `buildPromptRun` proof (plan §5.2 D8, the owner's
 * approved boundary: "конкретная версия prompt → /studio/dry-run → существующий
 * FS6 verbatim relay. Никаких AI-generated prompt drafts. Никакого auto-save.
 * Никакого refine. Никакого compare models.")
 *
 * The builder is pure, so what reaches the model is provable: the SELECTED
 * version's own text plus an optional sample input, and nothing else.
 */
import { describe, expect, it } from 'vitest';
import { mapPrompt } from '@/entities/prompt';
import { buildPromptRun } from '@/features/test-prompt';

const version = mapPrompt({
  id: 'prm_system_3',
  type: 'system',
  text: 'You write posts.\nKeep sentences short.',
  version: 3,
  author: 'usr_admin',
  model: 'claude-opus-4-8',
  created_at: '2026-07-30T08:15:00Z',
});

describe('buildPromptRun', () => {
  it('sends the version text VERBATIM when there is no sample input', () => {
    const run = buildPromptRun(version, '');
    expect(run.prompt).toBe('You write posts.\nKeep sentences short.');
  });

  it('appends only the user’s own sample input, clearly separated', () => {
    const run = buildPromptRun(version, 'topic: pricing changes');
    expect(run.prompt.startsWith(version.text)).toBe(true);
    expect(run.prompt).toContain('Sample input for this test run:');
    expect(run.prompt).toContain('topic: pricing changes');
  });

  it('contains NOTHING beyond the version text and the sample', () => {
    const run = buildPromptRun(version, 'sample');
    const allowed = new Set(
      [...version.text.split('\n'), '', '---', 'Sample input for this test run:', 'sample'].map(
        (line) => line.trim(),
      ),
    );
    for (const line of run.prompt.split('\n')) {
      expect(allowed.has(line.trim())).toBe(true);
    }
    // No other record type can leak in: the builder takes ONE version.
    for (const foreign of ['persona', 'channel', 'knowledge', 'document', 'image', 'memory']) {
      expect(run.prompt.toLowerCase()).not.toContain(foreign);
    }
  });

  it('never carries the row’s metadata into the model input', () => {
    const run = buildPromptRun(version, '');
    expect(run.prompt).not.toContain('prm_system_3');
    expect(run.prompt).not.toContain('usr_admin');
    expect(run.prompt).not.toContain('claude-opus-4-8');
  });

  it('states the isolation and the fact that a dry-run is not a production preview', () => {
    const run = buildPromptRun(version, '');
    expect(run.limitations).toMatch(/publishes nothing/i);
    expect(run.limitations).toMatch(/writes nothing to channel memory/i);
    expect(run.limitations).toMatch(/not a preview/i);
    expect(run.limitations).toMatch(/R5\.3/);
  });

  it('explainability names exactly what went in', () => {
    expect(buildPromptRun(version, '').dataUsed).toContain('Version v3');
    expect(buildPromptRun(version, '').dataUsed).toContain('prm_system_3');
    expect(buildPromptRun(version, '').dataUsed).not.toContain('sample input you typed');
    expect(buildPromptRun(version, 'x').dataUsed).toContain('sample input you typed');
  });

  it('is pure: same inputs, same output', () => {
    expect(buildPromptRun(version, 'a')).toEqual(buildPromptRun(version, 'a'));
  });
});
