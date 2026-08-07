'use client';

/**
 * Feature `send-message` (FS6 T-FS6.4). One chat turn end-to-end: ensure the
 * conversation exists (a first send creates it and reports `created` so the
 * screen can navigate), persist the user turn, stream the assistant turn via
 * the relay, then reconcile the FINISHED result into the conversation store
 * (Stage 2 §4) — tokens themselves stay in the transient streaming store.
 * Stop/error preserve partial output as an honest `partial`/`error` message;
 * cost and model are recorded ONLY from the wire result (never invented).
 */
import { useCallback } from 'react';
import {
  deriveTitle,
  newId,
  useConversationActions,
  type ChatMessageVM,
  type ConversationVM,
} from '@/entities/conversation';
import {
  useAssistantRunner,
  useAssistantSlice,
  type AssistantStreamSlice,
} from '@/shared/lib/stream';

export const chatStreamKey = (conversationId: string): string => `chat:${conversationId}`;

export interface SendOutcome {
  readonly conversationId: string;
  /** True when this send created the conversation (screen navigates to it). */
  readonly created: boolean;
}

export interface UseSendMessageApi {
  /** Transient stream slice for the CURRENT conversation (idle when none). */
  readonly stream: AssistantStreamSlice;
  readonly isStreaming: boolean;
  readonly send: (prompt: string, model: string) => SendOutcome;
  readonly stop: () => void;
  /** Clear a transient error bubble without sending anything. */
  readonly dismissError: () => void;
}

export function useSendMessage(conversation: ConversationVM | null): UseSendMessageApi {
  const actions = useConversationActions();
  const runner = useAssistantRunner();
  const stream = useAssistantSlice(conversation ? chatStreamKey(conversation.id) : null);

  const send = useCallback(
    (prompt: string, model: string): SendOutcome => {
      const target =
        conversation ?? actions.createConversation({ title: deriveTitle(prompt), model });
      const key = chatStreamKey(target.id);

      const userTurn: ChatMessageVM = {
        id: newId('msg'),
        conversationId: target.id,
        role: 'user',
        content: prompt,
        model: null,
        costUsd: null,
        status: 'complete',
        errorText: null,
        createdAt: new Date().toISOString(),
      };
      actions.appendMessage(userTurn);
      actions.touchConversation(target.id, { snippet: prompt, model });

      // The run continues past navigation/unmount — state lives in module
      // stores, and Stop aborts via the streaming registry.
      void runner.start(key, { prompt, model }).then((outcome) => {
        const at = new Date().toISOString();
        if (outcome.status === 'done' && outcome.result) {
          actions.appendMessage({
            id: newId('msg'),
            conversationId: target.id,
            role: 'assistant',
            content: outcome.result.output,
            model: outcome.result.model,
            costUsd: outcome.result.costUsd,
            status: 'complete',
            errorText: null,
            createdAt: at,
          });
          actions.touchConversation(target.id, {
            snippet: outcome.result.output,
            costDeltaUsd: outcome.result.costUsd,
            model: outcome.result.model,
          });
          runner.reset(key);
          return;
        }
        if (outcome.partialText) {
          // Stopped or failed mid-stream: the partial output is PRESERVED as
          // an honest message (requested model; cost unknown → null).
          actions.appendMessage({
            id: newId('msg'),
            conversationId: target.id,
            role: 'assistant',
            content: outcome.partialText,
            model,
            costUsd: null,
            status: outcome.status === 'stopped' ? 'partial' : 'error',
            errorText: outcome.status === 'error' ? (outcome.error?.message ?? null) : null,
            createdAt: at,
          });
          actions.touchConversation(target.id, { snippet: outcome.partialText });
          runner.reset(key);
          return;
        }
        if (outcome.status === 'stopped') {
          // Nothing streamed yet — nothing to preserve.
          runner.reset(key);
        }
        // error without any text: keep the transient error slice so the
        // thread shows the inline error + Retry (D3 §5 error state).
      });

      return { conversationId: target.id, created: conversation === null };
    },
    [conversation, actions, runner],
  );

  const stop = useCallback(() => {
    if (conversation) runner.stop(chatStreamKey(conversation.id));
  }, [conversation, runner]);

  const dismissError = useCallback(() => {
    if (conversation) runner.reset(chatStreamKey(conversation.id));
  }, [conversation, runner]);

  return {
    stream,
    isStreaming: stream.status === 'thinking' || stream.status === 'streaming',
    send,
    stop,
    dismissError,
  };
}
