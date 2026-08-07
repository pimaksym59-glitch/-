/**
 * Entity `conversation` — model (FS6 T-FS6.3). LOCAL-FIRST by the approved
 * plan deviation D1: the frozen contract has no conversation endpoints, so
 * threads live in this browser (stated honestly in the UI) behind ONE
 * repository (see repository.ts) that a future backend API replaces at a
 * single point. The Stage 3 `message` entity is folded in here until that API
 * exists — messages have no life outside their conversation and FSD forbids
 * sibling-entity imports.
 */
export type ChatRole = 'user' | 'assistant';

/** `partial` = streaming was stopped; `error` = generation failed after text. */
export type ChatMessageStatus = 'complete' | 'partial' | 'error';

export interface ChatMessageVM {
  readonly id: string;
  readonly conversationId: string;
  readonly role: ChatRole;
  readonly content: string;
  /** Model + cost come ONLY from the wire (assistant turns); never invented. */
  readonly model: string | null;
  readonly costUsd: number | null;
  readonly status: ChatMessageStatus;
  readonly errorText: string | null;
  readonly createdAt: string;
}

export interface ConversationVM {
  readonly id: string;
  readonly title: string;
  readonly snippet: string;
  readonly model: string;
  readonly pinned: boolean;
  /** Sum of wire-reported assistant costs; 0 until any arrive. */
  readonly costUsd: number;
  readonly messageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const TITLE_MAX = 64;
const SNIPPET_MAX = 96;

export function deriveTitle(prompt: string): string {
  const firstLine = prompt.split('\n', 1)[0]?.trim() ?? '';
  const base = firstLine || 'New conversation';
  return base.length > TITLE_MAX ? `${base.slice(0, TITLE_MAX - 1)}…` : base;
}

export function deriveSnippet(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET_MAX ? `${flat.slice(0, SNIPPET_MAX - 1)}…` : flat;
}

export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${uuid}`;
}

/** Pinned first, then most recently updated (D3 §6 ordering). */
export function orderConversations(list: readonly ConversationVM[]): readonly ConversationVM[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function searchConversations(
  list: readonly ConversationVM[],
  query: string,
): readonly ConversationVM[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (c) => c.title.toLowerCase().includes(q) || c.snippet.toLowerCase().includes(q),
  );
}
