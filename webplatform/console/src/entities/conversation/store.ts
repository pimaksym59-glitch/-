'use client';

/**
 * Reactive conversation state (FS6 T-FS6.3). A thin Zustand mirror of the
 * repository: every mutation goes repository-first, then updates the mirror —
 * components subscribe here and NEVER reach storage directly (owner's
 * condition 1). Draft-owner data (Stage 2 §7); server state never lives here.
 */
import { create } from 'zustand';
import {
  deriveSnippet,
  newId,
  orderConversations,
  type ChatMessageVM,
  type ConversationVM,
} from './model';
import { getConversationRepository } from './repository';

interface ConversationState {
  readonly hydrated: boolean;
  readonly conversations: readonly ConversationVM[];
  readonly messages: Readonly<Record<string, readonly ChatMessageVM[]>>;
  hydrate: () => void;
  loadMessages: (conversationId: string) => void;
  createConversation: (input: { title: string; model: string }) => ConversationVM;
  renameConversation: (id: string, title: string) => void;
  setPinned: (id: string, pinned: boolean) => void;
  removeConversation: (id: string) => void;
  appendMessage: (message: ChatMessageVM) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessageVM, 'id' | 'conversationId'>>,
  ) => void;
  /** Roll the conversation's snippet/cost/updatedAt after a turn. */
  touchConversation: (
    id: string,
    input: { snippet?: string; costDeltaUsd?: number; model?: string },
  ) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  hydrated: false,
  conversations: [],
  messages: {},

  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, conversations: getConversationRepository().listConversations() });
  },

  loadMessages: (conversationId) => {
    if (get().messages[conversationId]) return;
    const list = getConversationRepository().listMessages(conversationId);
    set((prev) => ({ messages: { ...prev.messages, [conversationId]: list } }));
  },

  createConversation: ({ title, model }) => {
    const at = nowIso();
    const conversation: ConversationVM = {
      id: newId('conv'),
      title,
      snippet: '',
      model,
      pinned: false,
      costUsd: 0,
      messageCount: 0,
      createdAt: at,
      updatedAt: at,
    };
    getConversationRepository().saveConversation(conversation);
    set((prev) => ({
      conversations: orderConversations([conversation, ...prev.conversations]),
      messages: { ...prev.messages, [conversation.id]: [] },
    }));
    return conversation;
  },

  renameConversation: (id, title) => {
    const current = get().conversations.find((c) => c.id === id);
    if (!current) return;
    const next = { ...current, title, updatedAt: nowIso() };
    getConversationRepository().saveConversation(next);
    set((prev) => ({
      conversations: orderConversations(prev.conversations.map((c) => (c.id === id ? next : c))),
    }));
  },

  setPinned: (id, pinned) => {
    const current = get().conversations.find((c) => c.id === id);
    if (!current) return;
    const next = { ...current, pinned, updatedAt: nowIso() };
    getConversationRepository().saveConversation(next);
    set((prev) => ({
      conversations: orderConversations(prev.conversations.map((c) => (c.id === id ? next : c))),
    }));
  },

  removeConversation: (id) => {
    getConversationRepository().deleteConversation(id);
    set((prev) => ({
      conversations: prev.conversations.filter((c) => c.id !== id),
      messages: Object.fromEntries(Object.entries(prev.messages).filter(([k]) => k !== id)),
    }));
  },

  appendMessage: (message) => {
    getConversationRepository().appendMessage(message);
    set((prev) => ({
      messages: {
        ...prev.messages,
        [message.conversationId]: [...(prev.messages[message.conversationId] ?? []), message],
      },
    }));
  },

  updateMessage: (conversationId, messageId, patch) => {
    getConversationRepository().updateMessage(conversationId, messageId, patch);
    set((prev) => ({
      messages: {
        ...prev.messages,
        [conversationId]: (prev.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...patch } : m,
        ),
      },
    }));
  },

  touchConversation: (id, input) => {
    const current = get().conversations.find((c) => c.id === id);
    if (!current) return;
    const next: ConversationVM = {
      ...current,
      snippet: input.snippet !== undefined ? deriveSnippet(input.snippet) : current.snippet,
      costUsd: current.costUsd + (input.costDeltaUsd ?? 0),
      model: input.model ?? current.model,
      messageCount: (get().messages[id] ?? getConversationRepository().listMessages(id)).length,
      updatedAt: nowIso(),
    };
    getConversationRepository().saveConversation(next);
    set((prev) => ({
      conversations: orderConversations(prev.conversations.map((c) => (c.id === id ? next : c))),
    }));
  },
}));
