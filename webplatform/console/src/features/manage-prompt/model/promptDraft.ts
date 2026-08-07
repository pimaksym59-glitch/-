/**
 * The version-composer draft owner (FS10 T-FS10.6 — Stage 2 §7 / D4 §7 "Draft
 * State: unsaved user work … auto-persisted locally, restored on return,
 * cleared on successful save").
 *
 * **This module is the ONLY toucher of storage on this surface** — components
 * never call `persist` directly. That is the FS6 ConversationRepository
 * condition applied at feature scale: one seam to swap, one place to audit.
 *
 * It is deliberately NOT server state: it never reads or writes the Query
 * cache, so the §3.4 rule ("no state owned by Query and Zustand/persist at
 * once") holds by construction — a draft is text the user has not saved, and
 * the saved truth only ever arrives back through `promptKeys` (plan §3.4).
 */
import { createPersistStore } from '@/shared/lib/persist';

export interface PromptDraft {
  readonly type: string;
  readonly text: string;
}

const VERSION = 1;

function storeFor(type: string) {
  return createPersistStore<PromptDraft>({ key: `prompt-draft:${type}`, version: VERSION });
}

export function readPromptDraft(type: string): PromptDraft | null {
  const draft = storeFor(type).read();
  if (!draft || typeof draft.text !== 'string' || draft.text === '') return null;
  return { type, text: draft.text };
}

export function writePromptDraft(draft: PromptDraft): void {
  if (draft.text.trim() === '') {
    clearPromptDraft(draft.type);
    return;
  }
  storeFor(draft.type).write(draft);
}

export function clearPromptDraft(type: string): void {
  storeFor(type).remove();
}
