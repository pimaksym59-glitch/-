/**
 * `buildActivityPrompt` — the pure prompt behind FS13's ONE AI surface
 * (D3 §24 "AI summarizes your recent activity").
 *
 * The pattern is unchanged from FS7 → FS12: a pure function, unit-proven to
 * carry ONLY the records the user has already loaded, run through the UNCHANGED
 * FS6 relay, on explicit user intent. What is new is the forbidden list, and it
 * is specific to this surface:
 *
 *  - **No security advice.** D3 §24 asks for "security tips"; the audit log
 *    carries actions, not posture, so a tip would be a recommendation with no
 *    data behind it — the FS11 ruling on recommendations and the FS12 ruling on
 *    destructive advice, both applied.
 *  - **No completeness claim.** These records are one filtered page. "You have
 *    done nothing else" is not a fact this data supports.
 *  - **No intent, no risk score, no anomaly.** The record says what changed, not
 *    why, and there is no baseline to call anything unusual.
 *  - **Nothing outside the slice.** No other user, no other actor, no inference
 *    about the platform at large.
 *
 * Only the fields the audit record actually carries are serialized. The user's
 * email is deliberately NOT included: the surface is already scoped to them,
 * and sending an identifier the summary cannot use would be a needless
 * disclosure to the model.
 */
import type { AuditRecordVM } from '@/entities/audit';

/** Kept small: a summary of a page, not a corpus. */
export const ACTIVITY_PROMPT_LIMIT = 20;

export const ACTIVITY_FORBIDDEN_CLAUSE =
  'Do not give security advice or recommendations. Do not claim this list is complete. ' +
  'Do not infer intent, motive, risk or anomaly. Do not mention any user, action or system ' +
  'that is not listed above. If the list does not support a statement, do not make it.';

function line(record: AuditRecordVM): string {
  const when = record.createdAt ?? 'time not recorded';
  const target = record.entityId ? `${record.entity}/${record.entityId}` : record.entity;
  const keys = [
    ...new Set([...Object.keys(record.before ?? {}), ...Object.keys(record.after ?? {})]),
  ].sort();
  const fields = keys.length > 0 ? ` fields: ${keys.join(', ')}` : '';
  return `- ${when} · ${record.action} · ${target} · ${record.changeKind}${fields}`;
}

export function buildActivityPrompt(records: readonly AuditRecordVM[]): string {
  const listed = records.slice(0, ACTIVITY_PROMPT_LIMIT);
  const body = listed.length > 0 ? listed.map(line).join('\n') : '- (no records were loaded)';

  return [
    'Summarize the following audit records. They are the actions this signed-in user took,',
    'as recorded by the platform. This is one loaded page of records, not their whole history.',
    '',
    body,
    '',
    'Write two or three sentences describing what these records show, grouping similar actions.',
    ACTIVITY_FORBIDDEN_CLAUSE,
  ].join('\n');
}
