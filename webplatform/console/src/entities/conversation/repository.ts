/**
 * ConversationRepository (FS6 T-FS6.3 — the owner's binding condition 1).
 * THE single abstraction every conversation/message read & write goes
 * through; components and hooks never touch storage directly. Today the only
 * implementation is local (localStorage via `shared/lib/persist`); when a
 * backend conversations API exists, an api-backed implementation replaces it
 * HERE — `getConversationRepository()` is the one swap point.
 */
import { createPersistStore, type PersistStore } from '@/shared/lib/persist';
import { orderConversations, type ChatMessageVM, type ConversationVM } from './model';

export interface ConversationRepository {
  listConversations(): readonly ConversationVM[];
  getConversation(id: string): ConversationVM | null;
  saveConversation(conversation: ConversationVM): void;
  deleteConversation(id: string): void;
  listMessages(conversationId: string): readonly ChatMessageVM[];
  appendMessage(message: ChatMessageVM): void;
  updateMessage(
    conversationId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessageVM, 'id' | 'conversationId'>>,
  ): void;
}

const VERSION = 1;
/** Honest local limits (stated in the UI): oldest UNPINNED threads evict first. */
export const MAX_CONVERSATIONS = 50;
export const MAX_MESSAGES_PER_CONVERSATION = 200;

function conversationsStore(): PersistStore<readonly ConversationVM[]> {
  return createPersistStore<readonly ConversationVM[]>({
    key: 'chat:conversations',
    version: VERSION,
  });
}

function messagesStore(conversationId: string): PersistStore<readonly ChatMessageVM[]> {
  return createPersistStore<readonly ChatMessageVM[]>({
    key: `chat:messages:${conversationId}`,
    version: VERSION,
  });
}

/** Oldest-unpinned-first eviction order (pinned survive until nothing else can evict). */
function evictionOrder(list: readonly ConversationVM[]): readonly ConversationVM[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? 1 : -1;
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

class LocalConversationRepository implements ConversationRepository {
  listConversations(): readonly ConversationVM[] {
    return orderConversations(conversationsStore().read() ?? []);
  }

  getConversation(id: string): ConversationVM | null {
    return this.listConversations().find((c) => c.id === id) ?? null;
  }

  saveConversation(conversation: ConversationVM): void {
    const rest = this.listConversations().filter((c) => c.id !== conversation.id);
    let next: readonly ConversationVM[] = [conversation, ...rest];
    while (next.length > MAX_CONVERSATIONS) {
      const victim = evictionOrder(next)[0];
      if (!victim || victim.id === conversation.id) break;
      messagesStore(victim.id).remove();
      next = next.filter((c) => c.id !== victim.id);
    }
    if (!conversationsStore().write(next)) {
      // Quota: evict one more and retry once; beyond that the write is lost
      // honestly (local-only storage has hard limits).
      const victim = evictionOrder(next).find((c) => c.id !== conversation.id);
      if (victim) {
        messagesStore(victim.id).remove();
        conversationsStore().write(next.filter((c) => c.id !== victim.id));
      }
    }
  }

  deleteConversation(id: string): void {
    messagesStore(id).remove();
    conversationsStore().write(this.listConversations().filter((c) => c.id !== id));
  }

  listMessages(conversationId: string): readonly ChatMessageVM[] {
    return messagesStore(conversationId).read() ?? [];
  }

  appendMessage(message: ChatMessageVM): void {
    const store = messagesStore(message.conversationId);
    const next = [...(store.read() ?? []), message].slice(-MAX_MESSAGES_PER_CONVERSATION);
    store.write(next);
  }

  updateMessage(
    conversationId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessageVM, 'id' | 'conversationId'>>,
  ): void {
    const store = messagesStore(conversationId);
    const next = (store.read() ?? []).map((m) => (m.id === messageId ? { ...m, ...patch } : m));
    store.write(next);
  }
}

let singleton: ConversationRepository | null = null;

/** THE swap point: a backend-API repository replaces the local one here. */
export function getConversationRepository(): ConversationRepository {
  singleton ??= new LocalConversationRepository();
  return singleton;
}

/** Test seam — reset the singleton between isolated unit tests. */
export function resetConversationRepositoryForTests(): void {
  singleton = null;
}
