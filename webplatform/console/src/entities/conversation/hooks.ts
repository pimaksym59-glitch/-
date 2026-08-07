'use client';

/**
 * Conversation hooks (FS6 T-FS6.3) — the public reactive API. Hydration is
 * lazy-on-first-use; everything flows through the store → repository (never
 * storage directly).
 */
import { useEffect } from 'react';
import { type ChatMessageVM, type ConversationVM } from './model';
import { useConversationStore } from './store';

export function useConversations(): readonly ConversationVM[] {
  const hydrate = useConversationStore((s) => s.hydrate);
  const conversations = useConversationStore((s) => s.conversations);
  useEffect(() => hydrate(), [hydrate]);
  return conversations;
}

export function useConversation(id: string | null): ConversationVM | null {
  const hydrate = useConversationStore((s) => s.hydrate);
  const conversation = useConversationStore(
    (s) => s.conversations.find((c) => c.id === id) ?? null,
  );
  useEffect(() => hydrate(), [hydrate]);
  return conversation;
}

const EMPTY_MESSAGES: readonly ChatMessageVM[] = [];

export function useChatMessages(conversationId: string | null): readonly ChatMessageVM[] {
  const loadMessages = useConversationStore((s) => s.loadMessages);
  const messages = useConversationStore((s) =>
    conversationId ? (s.messages[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  );
  useEffect(() => {
    if (conversationId) loadMessages(conversationId);
  }, [conversationId, loadMessages]);
  return messages;
}

/** Mutation API for widgets/features. Each selector returns a STABLE action
 * reference (never a fresh object — that would re-render on every store
 * change and break useSyncExternalStore's cached-snapshot contract). */
export function useConversationActions() {
  return {
    createConversation: useConversationStore((s) => s.createConversation),
    renameConversation: useConversationStore((s) => s.renameConversation),
    setPinned: useConversationStore((s) => s.setPinned),
    removeConversation: useConversationStore((s) => s.removeConversation),
    appendMessage: useConversationStore((s) => s.appendMessage),
    updateMessage: useConversationStore((s) => s.updateMessage),
    touchConversation: useConversationStore((s) => s.touchConversation),
  };
}
