'use client';

/**
 * Message thread (FS6 T-FS6.6 — D3 §5). The persisted backlog is VIRTUALIZED
 * (TanStack Virtual, dynamic measurement — D3's "Lazy: older messages"); the
 * in-flight assistant turn renders below it straight from the transient
 * stream slice (thinking → streaming → error-with-retry). Auto-follow sticks
 * to the bottom until the user scrolls up.
 */
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import type { ChatMessageVM } from '@/entities/conversation';
import type { AssistantStreamSlice } from '@/shared/lib/stream';
import { StreamingMessage } from '@/shared/ui/ai';
import { MessageItem } from './MessageItem';

export interface ThreadProps {
  readonly messages: readonly ChatMessageVM[];
  readonly stream: AssistantStreamSlice;
  readonly onStop: () => void;
  readonly onRetryStream: () => void;
  readonly onCopy: (message: ChatMessageVM) => void;
  readonly onRetry: (message: ChatMessageVM) => void;
  readonly onInsert: (message: ChatMessageVM) => void;
  readonly canAct: boolean;
}

export function Thread({
  messages,
  stream,
  onStop,
  onRetryStream,
  onCopy,
  onRetry,
  onInsert,
  canAct,
}: ThreadProps): React.ReactElement {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 6,
  });

  // Follow the conversation unless the user scrolled up to read back.
  useEffect(() => {
    const el = parentRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, stream.text, stream.status]);

  const showTransient =
    stream.status === 'thinking' || stream.status === 'streaming' || stream.status === 'error';
  const transientState =
    stream.status === 'error' ? 'error' : stream.status === 'streaming' ? 'streaming' : 'thinking';

  return (
    <div
      ref={parentRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
      aria-label="Conversation"
    >
      <div
        className="relative mx-auto w-full max-w-3xl"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const message = messages[item.index];
          if (!message) return null;
          return (
            <div
              key={message.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-5"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <MessageItem
                message={message}
                onCopy={onCopy}
                onRetry={onRetry}
                onInsert={onInsert}
                canAct={canAct}
              />
            </div>
          );
        })}
      </div>

      {showTransient ? (
        <div className="mx-auto w-full max-w-3xl pb-2">
          <StreamingMessage
            state={transientState}
            text={stream.text}
            {...(stream.error ? { errorText: stream.error.message } : {})}
            onStop={onStop}
            onRetry={onRetryStream}
          />
        </div>
      ) : null}
    </div>
  );
}
