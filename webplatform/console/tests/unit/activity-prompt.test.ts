/**
 * FS13 T-FS13.10 — the byte-exact proof for the stage's ONE AI surface.
 *
 * Same standard as `document-prompt` (FS7), `persona-prompt` (FS8),
 * `image-prompt` (FS9), `prompt-run` (FS10), `metrics-prompt` (FS11) and
 * `job-prompt` (FS12): the prompt carries ONLY what the user already loaded,
 * and the claims the surface must not make are refused in the prompt rather
 * than left to the model's discretion.
 *
 * The refusal that is specific to this surface: **D3 §24 asks this row for
 * "security tips"**. The audit log records actions, not posture — a tip would
 * be a recommendation with no data behind it (the FS11 ruling on
 * recommendations, and the FS12 ruling on destructive advice, both apply).
 */
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_FORBIDDEN_CLAUSE,
  ACTIVITY_PROMPT_LIMIT,
  buildActivityPrompt,
} from '@/features/explain-activity';
import type { AuditRecordVM } from '@/entities/audit';

function record(over: Partial<AuditRecordVM> = {}): AuditRecordVM {
  return {
    id: 'aud_x',
    actorId: 'usr_fixture_owner',
    action: 'channel.paused',
    entity: 'channel',
    entityId: 'ch_tech',
    before: { status: 'active' },
    after: { status: 'paused' },
    createdAt: '2026-07-30T07:02:00Z',
    changeKind: 'updated',
    ...over,
  };
}

describe('what the prompt carries', () => {
  it('serializes only the fields the audit record actually has', () => {
    const prompt = buildActivityPrompt([record()]);
    expect(prompt).toContain('channel.paused');
    expect(prompt).toContain('channel/ch_tech');
    expect(prompt).toContain('2026-07-30T07:02:00Z');
    expect(prompt).toContain('updated');
    // Field NAMES travel; field VALUES do not — a summary does not need them,
    // and an audit payload can carry anything.
    expect(prompt).toContain('fields: status');
    expect(prompt).not.toContain('paused"');
  });

  it('never carries the user’s identity — the surface is already scoped', () => {
    const prompt = buildActivityPrompt([record()]);
    expect(prompt).not.toContain('usr_fixture_owner');
    expect(prompt).not.toContain('@console.local');
  });

  it('states that the list is one page, not a full history', () => {
    expect(buildActivityPrompt([record()])).toContain('not their whole history');
  });

  it('caps how many records travel', () => {
    const many = Array.from({ length: ACTIVITY_PROMPT_LIMIT + 12 }, (_, i) =>
      record({ id: `aud_${String(i)}`, action: `action.${String(i)}` }),
    );
    const prompt = buildActivityPrompt(many);
    expect(prompt).toContain('action.0');
    expect(prompt).not.toContain(`action.${String(ACTIVITY_PROMPT_LIMIT + 5)}`);
  });

  it('handles an empty list without inventing a record', () => {
    const prompt = buildActivityPrompt([]);
    expect(prompt).toContain('(no records were loaded)');
    expect(prompt).toContain(ACTIVITY_FORBIDDEN_CLAUSE);
  });

  it('renders a record with no field detail without padding it', () => {
    const prompt = buildActivityPrompt([
      record({ before: null, after: null, changeKind: 'unknown', entityId: null }),
    ]);
    expect(prompt).not.toContain('fields:');
    expect(prompt).toContain('unknown');
  });
});

describe('what the prompt forbids', () => {
  it('refuses security advice — the data cannot support it', () => {
    const clause = ACTIVITY_FORBIDDEN_CLAUSE.toLowerCase();
    expect(clause).toContain('security advice');
    expect(clause).toContain('recommendation');
  });

  it('refuses completeness, intent, risk and anomaly claims', () => {
    const clause = ACTIVITY_FORBIDDEN_CLAUSE.toLowerCase();
    expect(clause).toContain('complete');
    expect(clause).toContain('intent');
    expect(clause).toContain('risk');
    expect(clause).toContain('anomaly');
  });

  it('refuses to mention anything outside the listed records', () => {
    expect(ACTIVITY_FORBIDDEN_CLAUSE.toLowerCase()).toContain('not listed above');
  });

  it('carries the forbidden clause on every build, not just the empty one', () => {
    expect(buildActivityPrompt([record()])).toContain(ACTIVITY_FORBIDDEN_CLAUSE);
  });
});
