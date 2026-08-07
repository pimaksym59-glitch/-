'use client';

/**
 * ChatView (FS6 T-FS6.6 — D3 §5 composition). Three-pane on desktop
 * (history rail · thread · Inspector via the shell), sheet-based rail below
 * `lg`, sticky composer. Keyboard: `⌘↵` send · `⇧↵` newline · `↑` edit last ·
 * `⌘⌫` stop · `⌘⇧O` new chat · `[`/`]` prev/next conversation. A `?q=` query
 * (palette `/` Ask AI) auto-sends ONCE and is consumed from the URL.
 */
import { History, PanelRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import {
  useChatMessages,
  useConversation,
  useConversations,
  type ChatMessageVM,
} from '@/entities/conversation';
import { Composer, useSendMessage } from '@/features/send-message';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useInspector } from '@/shared/hooks';
import { useCan, useToast } from '@/shared/providers';
import { Sheet } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { ChatEmpty } from './ChatEmpty';

/**
 * Heavy leaves are LAZY (FS3 discipline / owner's FS6 condition 6): the shell
 * + composer paint instantly; the virtualized thread (StreamingMessage chain),
 * the history rail (menus/dialogs) and the insert dialog (mounted only on the
 * action) live in their own chunks outside the route's First Load.
 */
const Thread = dynamic(() => import('./Thread').then((m) => m.Thread), {
  loading: () => (
    <div className="min-h-0 flex-1 px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Skeleton height={72} />
        <Skeleton height={120} />
      </div>
    </div>
  ),
});
const HistoryRail = dynamic(() => import('./HistoryRail').then((m) => m.HistoryRail), {
  loading: () => (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton height={32} />
      <Skeleton height={36} />
      <Skeleton height={120} />
    </div>
  ),
});
const InsertDialog = dynamic(
  () => import('@/features/insert-to-channel').then((m) => m.InsertDialog),
  { loading: () => null },
);

export function ChatView({
  conversationId,
}: {
  readonly conversationId: string | null;
}): React.ReactElement {
  const router = useRouter();
  const can = useCan();
  const { toast } = useToast();
  const { inspect } = useInspector();
  const conversations = useConversations();
  const conversation = useConversation(conversationId);
  const messages = useChatMessages(conversationId);
  const { stream, isStreaming, send, stop, dismissError } = useSendMessage(conversation);

  const [value, setValue] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [railOpen, setRailOpen] = useState(false);
  const [inserting, setInserting] = useState<ChatMessageVM | null>(null);
  const [pendingQ, setPendingQ] = useQueryState('q');
  const consumedQ = useRef(false);

  // Adopt the conversation's model when switching threads.
  useEffect(() => {
    if (conversation) setModel(conversation.model);
  }, [conversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- id switch only

  function handleSend(text?: string): void {
    const prompt = (text ?? value).trim();
    if (!prompt || isStreaming) return;
    const outcome = send(prompt, model);
    setValue('');
    if (outcome.created) router.replace(`/chat/${outcome.conversationId}`);
  }

  // Palette `/` Ask AI hand-off: consume `?q=` exactly once. The query is NOT
  // cleared via nuqs on the created path — its queued URL write would RACE the
  // created-conversation `router.replace` and win, stranding the user on
  // `/chat` (found live in FS6); the replace itself drops `?q=` wholesale.
  useEffect(() => {
    if (!pendingQ || consumedQ.current) return;
    consumedQ.current = true;
    const prompt = pendingQ.trim();
    if (!prompt || isStreaming) {
      void setPendingQ(null);
      return;
    }
    const outcome = send(prompt, model);
    if (outcome.created) router.replace(`/chat/${outcome.conversationId}`);
    else void setPendingQ(null);
  }, [pendingQ]); // eslint-disable-line react-hooks/exhaustive-deps -- consume-once effect

  // Chat-scope shortcuts (registry entries chat-stop / chat-new / chat-prev/next).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key === 'Backspace') {
        event.preventDefault();
        stop();
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        router.push('/chat');
        return;
      }
      if (isTextEntryTarget(event.target)) return;
      if (event.key === '[' || event.key === ']') {
        const index = conversations.findIndex((c) => c.id === conversationId);
        if (index === -1 && conversations.length === 0) return;
        const nextIndex =
          event.key === '['
            ? Math.max(0, index <= 0 ? 0 : index - 1)
            : Math.min(conversations.length - 1, index + 1);
        const target = conversations[nextIndex];
        if (target && target.id !== conversationId) {
          event.preventDefault();
          router.push(`/chat/${target.id}`);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [conversations, conversationId, router, stop]);

  const lastUserPrompt = [...messages].reverse().find((m) => m.role === 'user')?.content;
  const canAct = can('content.edit');

  function copyMessage(message: ChatMessageVM): void {
    void navigator.clipboard?.writeText(message.content).then(() => {
      toast({ kind: 'info', title: 'Copied to clipboard' });
    });
  }

  function retryMessage(message: ChatMessageVM): void {
    // Re-send the nearest preceding user turn as a NEW turn (history is
    // never rewritten).
    const index = messages.findIndex((m) => m.id === message.id);
    const source =
      message.role === 'user'
        ? message
        : [...messages.slice(0, Math.max(0, index))].reverse().find((m) => m.role === 'user');
    if (source) handleSend(source.content);
  }

  function retryStream(): void {
    dismissError();
    if (lastUserPrompt) handleSend(lastUserPrompt);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 md:h-[calc(100dvh-3.5rem)]">
      <aside
        aria-label="Chat history"
        className="hidden w-72 shrink-0 border-r border-border-subtle lg:block"
      >
        <HistoryRail activeId={conversationId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          <button
            type="button"
            aria-label="Conversation history"
            onClick={() => setRailOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary lg:hidden"
          >
            <History aria-hidden className="size-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
            {conversation?.title ?? 'AI Chat'}
          </h1>
          {conversation ? (
            <button
              type="button"
              onClick={() => inspect({ type: 'conversation', id: conversation.id })}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <PanelRight aria-hidden className="size-3.5" />
              Details
            </button>
          ) : null}
        </header>

        {conversation === null && messages.length === 0 && stream.status === 'idle' ? (
          <div className="min-h-0 flex-1">
            <ChatEmpty onPick={(suggestion) => setValue(suggestion)} />
          </div>
        ) : (
          <Thread
            messages={messages}
            stream={stream}
            onStop={stop}
            onRetryStream={retryStream}
            onCopy={copyMessage}
            onRetry={retryMessage}
            onInsert={(message) => setInserting(message)}
            canAct={canAct}
          />
        )}

        <div className="border-t border-border-subtle p-3">
          <div className="mx-auto w-full max-w-3xl">
            <Composer
              value={value}
              onValueChange={setValue}
              onSend={() => handleSend()}
              streaming={isStreaming}
              onStop={stop}
              model={model}
              onModelChange={setModel}
              lastUserPrompt={lastUserPrompt}
            />
          </div>
        </div>
      </div>

      <Sheet
        open={railOpen}
        onOpenChange={setRailOpen}
        side="left"
        title="Conversations"
        description="Your local chat history."
      >
        <HistoryRail activeId={conversationId} onNavigated={() => setRailOpen(false)} />
      </Sheet>

      {/* Mounted only on the action — the chunk loads when first inserted. */}
      {inserting !== null ? (
        <InsertDialog
          open
          onOpenChange={(open) => {
            if (!open) setInserting(null);
          }}
          content={inserting.content}
        />
      ) : null}
    </div>
  );
}
