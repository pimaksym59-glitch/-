/**
 * Job prompt builder (FS12 T-FS12.15) — a PURE function so the plan's §5.2 D12
 * condition is unit-provable: the prompt contains the SELECTED task's own
 * record and the user's question, and **NOTHING else** — no other task, no log
 * line, no metric, no channel content, no configuration.
 *
 * This is the stage's ONE AI surface, and it is deliberately the narrowest of
 * the five D3 asks for. The other four were refused on contract grounds and are
 * honest seams instead: Logs has no data at all, Flags has no data at all,
 * Health triage would be a CAUSAL claim, and Billing forecasting is exactly the
 * forecast the owner ruled out at FS11.
 *
 * The instruction block forbids the four fabrications this surface could
 * otherwise drift into:
 *   1. a root cause beyond what the record's own fields say;
 *   2. quoting or inventing log lines (the console cannot read logs — D3);
 *   3. predicting whether a retry will succeed;
 *   4. recommending a destructive action (the operator decides, and the
 *      backend is the boundary).
 */
import type { QueueTaskVM } from '@/entities/job-queue';

export interface JobPrompt {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability "limits" — scope and honesty. */
  readonly limitations: string;
}

export const EXPLAIN_JOB_QUESTION =
  'Explain what this task record says about what happened, in 3 short bullet points.';

function line(label: string, value: string | number | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : `- ${label}: ${text}`;
}

export function buildJobPrompt(task: QueueTaskVM, question: string): JobPrompt {
  const asked = question.trim() === '' ? EXPLAIN_JOB_QUESTION : question.trim();

  const record: readonly (string | null)[] = [
    line('Task id', task.id),
    line('Type', task.type),
    // The RAW wire status, always — the reader must see the contract's own
    // word (`dead`, `deferred`, `cancelled`), not an ONYX approximation.
    line('Status (wire value)', task.rawStatus),
    line('Attempts', task.attempts),
    line('Priority', task.priority),
    line('Scheduled for', task.runAt),
    line('Created at', task.createdAt),
    line('Channel id', task.channelId),
    line('Last error', task.error),
  ];
  const fields = record.filter((entry): entry is string => entry !== null);

  const prompt = [
    'You are explaining ONE background task record from an automation platform.',
    '',
    'THE RECORD (this is the only data you have):',
    ...fields,
    '',
    'RULES — follow all of them:',
    '- Use ONLY the fields above. You have no logs, no metrics and no other tasks.',
    '- Do NOT invent or quote log lines. The console cannot read logs.',
    '- Do NOT assert a root cause the fields do not state. If the cause is not in',
    '  the record, say that it is not in the record.',
    '- Do NOT predict whether a retry or requeue will succeed.',
    '- Do NOT recommend cancelling, deleting or requeueing anything; the operator',
    '  decides and the backend enforces what is allowed.',
    '- If a field is missing, say it is missing rather than guessing it.',
    '',
    `QUESTION: ${asked}`,
  ].join('\n');

  return {
    prompt,
    dataUsed: `One task record (${task.id}): ${String(fields.length)} fields from GET /tasks/{id}. No logs, no other tasks, no metrics.`,
    limitations:
      'Grounded only in this task record. The console has no log access, so any cause not present in the record is unknown here — not absent. No prediction about a retry is made, and no action is recommended.',
  };
}
