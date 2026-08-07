'use client';

/**
 * One persisted chat turn (FS6 T-FS6.6). User turns are quiet right-aligned
 * bubbles; assistant turns render through StreamingMessage in its `done` form
 * with wire-reported model/cost whispers. `partial` (stopped) and `error`
 * turns keep their preserved text and say honestly what happened — nothing is
 * re-animated, nothing invented.
 */
import type { ChatMessageVM } from '@/entities/conversation';
import { formatCost } from '@/shared/lib/format';
import { StreamingMessage } from '@/shared/ui/ai';
import { Badge } from '@/shared/ui/badge';

export interface MessageItemProps {
  readonly message: ChatMessageVM;
  readonly onCopy: (message: ChatMessageVM) => void;
  readonly onRetry: (message: ChatMessageVM) => void;
  readonly onInsert: (message: ChatMessageVM) => void;
  /** Review-capable roles get retry/insert; read-only viewers get copy only. */
  readonly canAct: boolean;
}

export function MessageItem({
  message,
  onCopy,
  onRetry,
  onInsert,
  canAct,
}: MessageItemProps): React.ReactElement {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-inset px-4 py-2.5 text-[15px] leading-7 text-primary">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div>
      <StreamingMessage
        state="done"
        text={message.content}
        {...(message.model ? { modelWhisper: message.model } : {})}
        {...(message.costUsd !== null ? { costWhisper: formatCost(message.costUsd) } : {})}
        onCopy={() => onCopy(message)}
        {...(canAct ? { onRetry: () => onRetry(message) } : {})}
        {...(canAct ? { onInsertToChannel: () => onInsert(message) } : {})}
      />
      {message.status === 'partial' ? (
        <p className="mt-1 flex items-center gap-2 text-[13px] text-secondary">
          <Badge tone="neutral">Stopped</Badge>
          Generation was stopped — this is the partial output, kept as-is.
        </p>
      ) : null}
      {message.status === 'error' ? (
        <p className="mt-1 flex items-center gap-2 text-[13px] text-danger">
          <Badge tone="danger">Failed</Badge>
          {message.errorText ?? 'Generation failed after this partial output.'}
        </p>
      ) : null}
    </div>
  );
}
