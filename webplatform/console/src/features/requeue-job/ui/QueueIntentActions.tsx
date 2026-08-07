'use client';

/**
 * The three queue intents as affordances (FS12). Each is offered only where the
 * contract's own lifecycle allows it (`allowedIntents`), each is CONFIRMED
 * (D2 §13.10 — destructive actions are separated and confirmed; D3 §17 says
 * `r` requeue confirms), and each reports **queued truth**.
 *
 * **This component owns its mutation hook, deliberately.** Calling
 * `useQueueIntents` from the eager list view pulled TanStack Query's mutation
 * machinery and Next's `dynamic()` client runtime into `/jobs`'s First Load —
 * measured as an 8.5 kB route-only chunk that put the route at 181 / 180 kB.
 * Owning the hook here keeps all of it inside this lazy chunk: a reader who
 * never acts never downloads it. A per-row hook instance also makes `pending`
 * per-row, which is more accurate than a single shared flag.
 *
 * RBAC: rendered only when the caller holds `platform.manage`. The UI hiding an
 * action is reflection, never protection (SEC-7).
 */
import { useState } from 'react';
import { allowedIntents, type QueueTaskVM } from '@/entities/job-queue';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { useQueueIntents, type QueueIntent } from '../model/useQueueIntents';

const CONFIRM_COPY: Record<QueueIntent, { readonly title: string; readonly description: string }> =
  {
    cancel: {
      title: 'Cancel this task?',
      description:
        'The task stops being eligible for a worker. Work already in flight finishes its current step (§R12.4).',
    },
    run: {
      title: 'Run this task now?',
      description:
        'The task is queued for an immediate run. It executes through the same queue as scheduled work (§R10.1) — there is no second execution path.',
    },
    requeue: {
      title: 'Requeue this dead task?',
      description:
        'The dead-letter task returns to the queue as pending (§R8.11). Whatever made it fail may make it fail again.',
    },
  };

export function QueueIntentActions({
  task,
  status = null,
  type = null,
  channelId = null,
}: {
  readonly task: QueueTaskVM;
  /** The filters the list was loaded under — the keys to invalidate. */
  readonly status?: string | null;
  readonly type?: string | null;
  readonly channelId?: string | null;
}): React.ReactElement | null {
  const [confirming, setConfirming] = useState<QueueIntent | null>(null);
  const intents = useQueueIntents(status, type, channelId);
  const allowed = allowedIntents(task);
  const busy = intents.pending === task.id;

  const available: readonly QueueIntent[] = (['requeue', 'run', 'cancel'] as const).filter(
    (intent) => allowed[intent],
  );
  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {available.map((intent) => (
        <Button
          key={intent}
          variant={intent === 'cancel' ? 'ghost' : 'secondary'}
          size="sm"
          disabled={busy}
          onClick={() => setConfirming(intent)}
        >
          {intent === 'requeue' ? 'Requeue' : intent === 'run' ? 'Run now' : 'Cancel'}
        </Button>
      ))}
      {confirming ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null);
          }}
          title={CONFIRM_COPY[confirming].title}
          description={CONFIRM_COPY[confirming].description}
          confirmLabel={confirming === 'cancel' ? 'Cancel task' : 'Queue it'}
          destructive={confirming === 'cancel'}
          onConfirm={() => {
            intents.send(task.id, confirming);
            setConfirming(null);
          }}
        />
      ) : null}
    </div>
  );
}
