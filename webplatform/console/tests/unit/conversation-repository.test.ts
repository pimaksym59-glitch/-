/**
 * ConversationRepository (FS6 T-FS6.3 — the owner's single-abstraction
 * condition): CRUD round-trips, pinned-first ordering, oldest-unpinned
 * eviction at the cap, per-conversation message cap, and the model helpers.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  deriveSnippet,
  deriveTitle,
  getConversationRepository,
  orderConversations,
  resetConversationRepositoryForTests,
  searchConversations,
  type ChatMessageVM,
  type ConversationVM,
} from '@/entities/conversation';

function conv(id: string, overrides: Partial<ConversationVM> = {}): ConversationVM {
  return {
    id,
    title: `Conversation ${id}`,
    snippet: '',
    model: 'claude-opus-4-8',
    pinned: false,
    costUsd: 0,
    messageCount: 0,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: `2026-08-01T08:00:${id.padStart(2, '0')}.000Z`,
    ...overrides,
  };
}

function msg(conversationId: string, id: string): ChatMessageVM {
  return {
    id,
    conversationId,
    role: 'user',
    content: `message ${id}`,
    model: null,
    costUsd: null,
    status: 'complete',
    errorText: null,
    createdAt: '2026-08-01T08:00:00.000Z',
  };
}

beforeEach(() => {
  window.localStorage.clear();
  resetConversationRepositoryForTests();
});

describe('ConversationRepository (FS6 T-FS6.3)', () => {
  it('round-trips conversations and messages through storage', () => {
    const repo = getConversationRepository();
    repo.saveConversation(conv('1'));
    repo.appendMessage(msg('1', 'm1'));
    repo.appendMessage(msg('1', 'm2'));

    resetConversationRepositoryForTests(); // a fresh instance re-reads storage
    const fresh = getConversationRepository();
    expect(fresh.getConversation('1')?.title).toBe('Conversation 1');
    expect(fresh.listMessages('1').map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('updateMessage patches one message in place', () => {
    const repo = getConversationRepository();
    repo.saveConversation(conv('1'));
    repo.appendMessage(msg('1', 'm1'));
    repo.updateMessage('1', 'm1', { status: 'partial' });
    expect(repo.listMessages('1')[0]?.status).toBe('partial');
  });

  it('deleteConversation removes the thread AND its messages', () => {
    const repo = getConversationRepository();
    repo.saveConversation(conv('1'));
    repo.appendMessage(msg('1', 'm1'));
    repo.deleteConversation('1');
    expect(repo.getConversation('1')).toBeNull();
    expect(repo.listMessages('1')).toEqual([]);
  });

  it(`evicts the OLDEST UNPINNED conversation beyond the cap of ${MAX_CONVERSATIONS}`, () => {
    const repo = getConversationRepository();
    // Fill exactly to the cap; oldest ('0') is pinned — it must survive.
    for (let i = 0; i < MAX_CONVERSATIONS; i += 1) {
      repo.saveConversation(conv(String(i), { pinned: i === 0 }));
    }
    repo.appendMessage(msg('1', 'm1')); // '1' = oldest unpinned → the victim
    repo.saveConversation(conv('overflow', { updatedAt: '2026-08-01T09:00:00.000Z' }));

    const ids = repo.listConversations().map((c) => c.id);
    expect(ids).toHaveLength(MAX_CONVERSATIONS);
    expect(ids).toContain('0'); // pinned survivor
    expect(ids).toContain('overflow');
    expect(ids).not.toContain('1'); // oldest unpinned evicted…
    expect(repo.listMessages('1')).toEqual([]); // …together with its messages
  });

  it(`caps messages per conversation at ${MAX_MESSAGES_PER_CONVERSATION} (oldest dropped)`, () => {
    const repo = getConversationRepository();
    repo.saveConversation(conv('1'));
    for (let i = 0; i < MAX_MESSAGES_PER_CONVERSATION + 5; i += 1) {
      repo.appendMessage(msg('1', `m${i}`));
    }
    const list = repo.listMessages('1');
    expect(list).toHaveLength(MAX_MESSAGES_PER_CONVERSATION);
    expect(list[0]?.id).toBe('m5');
  });
});

describe('conversation model helpers', () => {
  it('derives bounded titles and snippets', () => {
    expect(deriveTitle('Hello world\nsecond line')).toBe('Hello world');
    expect(deriveTitle('')).toBe('New conversation');
    expect(deriveTitle('x'.repeat(100))).toHaveLength(64);
    expect(deriveSnippet('a  b\n\nc')).toBe('a b c');
  });

  it('orders pinned first, then by recency; search matches title and snippet', () => {
    const list = [
      conv('old'),
      conv('new', { updatedAt: '2026-08-01T09:00:00.000Z' }),
      conv('pinned', { pinned: true }),
    ];
    expect(orderConversations(list).map((c) => c.id)).toEqual(['pinned', 'new', 'old']);
    expect(searchConversations(list, 'conversation NEW').map((c) => c.id)).toEqual(['new']);
  });
});
