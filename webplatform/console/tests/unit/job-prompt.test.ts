/**
 * FS12 T-FS12.15 / plan §5.2 D12 — the byte-exact single-record proof for the
 * stage's ONE AI surface.
 *
 * `buildJobPrompt` is pure, so what the model receives is provable rather than
 * reviewable: exactly one task record, the user's question, and an instruction
 * block that forbids the four fabrications this surface could drift into.
 */
import { describe, expect, it } from 'vitest';
import { buildJobPrompt, EXPLAIN_JOB_QUESTION } from '@/features/explain-job';
import { mapQueueTask } from '@/entities/job-queue';

const task = mapQueueTask({
  id: 'task_dead_1',
  type: 'publish',
  status: 'dead',
  channel_id: 'ch_tech',
  attempts: 5,
  priority: 100,
  run_at: '2026-07-30T05:00:00Z',
  created_at: '2026-07-30T04:00:00Z',
  last_error: 'TelegramForbidden: bot was kicked from the channel',
});

const other = mapQueueTask({
  id: 'task_secret_9',
  type: 'backup',
  status: 'succeeded',
  attempts: 1,
  created_at: '2026-07-30T03:00:00Z',
  last_error: 'SHOULD-NEVER-APPEAR',
});

describe('buildJobPrompt — scope', () => {
  it('contains the selected record and nothing else', () => {
    const { prompt } = buildJobPrompt(task, 'why did this die?');
    expect(prompt).toContain('task_dead_1');
    expect(prompt).toContain('publish');
    expect(prompt).toContain('TelegramForbidden');
    expect(prompt).toContain('why did this die?');
    // No other task can leak in — the builder takes exactly one.
    expect(prompt).not.toContain(other.id);
    expect(prompt).not.toContain('SHOULD-NEVER-APPEAR');
  });

  it('uses the RAW wire status, not the ONYX approximation', () => {
    const { prompt } = buildJobPrompt(task, '');
    expect(prompt).toContain('Status (wire value): dead');
    expect(prompt).not.toContain('Failed');
  });

  it('falls back to the canned question when none is given', () => {
    expect(buildJobPrompt(task, '   ').prompt).toContain(EXPLAIN_JOB_QUESTION);
  });

  it('omits absent fields rather than inventing placeholders', () => {
    const bare = mapQueueTask({
      id: 't_bare',
      type: 'cleanup',
      status: 'pending',
      attempts: 0,
      created_at: '2026-07-30T00:00:00Z',
    });
    const { prompt } = buildJobPrompt(bare, '');
    expect(prompt).not.toContain('Last error');
    expect(prompt).not.toContain('Channel id');
    expect(prompt).not.toContain('null');
    expect(prompt).not.toContain('undefined');
  });
});

describe('buildJobPrompt — the forbidden claims', () => {
  const { prompt } = buildJobPrompt(task, '');

  it('forbids inventing or quoting log lines', () => {
    expect(prompt).toContain('Do NOT invent or quote log lines');
    expect(prompt).toContain('no logs');
  });

  it('forbids asserting a cause the record does not state', () => {
    expect(prompt).toContain('Do NOT assert a root cause the fields do not state');
  });

  it('forbids predicting whether a retry will work', () => {
    expect(prompt).toContain('Do NOT predict whether a retry or requeue will succeed');
  });

  it('forbids recommending a destructive action', () => {
    expect(prompt).toContain('Do NOT recommend cancelling, deleting or requeueing');
  });

  it('states its own limits honestly for the Explainability panel', () => {
    const built = buildJobPrompt(task, '');
    expect(built.dataUsed).toContain('One task record');
    expect(built.dataUsed).toContain('No logs');
    expect(built.limitations).toContain('no log access');
    expect(built.limitations).toContain('no action is recommended');
    // Confidence is deliberately absent — the contract carries none.
    expect(built.limitations.toLowerCase()).not.toContain('confidence');
  });
});
