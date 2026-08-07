/**
 * Entity `job-queue` — the ADMIN projection of `/tasks` (FS12, D3 §17).
 *
 * **A separate slice from FS5's `entities/job`, by measurement.** FS5's
 * `JobInspector` is imported STATICALLY by `widgets/inspector/Inspector.tsx`,
 * which sits in shell commons — so `entities/job`'s model *and* its
 * `'use client'` hooks are already in every route's First Load. Adding anything
 * to that barrel would tax all 31 routes (the FS11 R1f lesson in its most
 * expensive form). This slice therefore imports **nothing** from
 * `entities/job`, exactly as `entities/analytics-report` relates to
 * `entities/analytics`.
 *
 * **Status mapping (plan §5.2 D14, owner-ruled Option B — zero commons bytes).**
 * `task_status` (§R4.11) carries eight values; D2 §11 has an exact equivalent
 * for five of them and none for `deferred`, `cancelled`, `dead`. Only the exact
 * five are mapped; the other three render as EXPLICIT RAW LABELS. They are not
 * collapsed into "Failed", because the difference decides the action —
 * `requeue` applies to `dead` (§R8.11), `run` does not apply to `cancelled`,
 * and `deferred` is waiting for a valid window (§R8.7), not broken. No ONYX
 * status is registered and no token is added.
 */
import { STATUS, type Status } from '@/shared/types/status';
import type { TaskAdminWireDTO } from '@/shared/types';

export type { TaskAdminWireDTO };

/** The contract's eight `task_status` values (§R4.11), verbatim. */
export const TASK_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'deferred',
  'needs_review',
  'cancelled',
  'dead',
] as const;

/** The contract's nine `task_type` values (§R4.12), verbatim. */
export const TASK_TYPES = [
  'generate_text',
  'validate',
  'generate_image',
  'publish',
  'collect_metrics',
  'backup',
  'cleanup',
  'reindex',
  'health_check',
] as const;

/**
 * The five wire statuses with an EXACT D2 §11 equivalent. Each pairing is a
 * definitional match, not an approximation:
 *   pending      -> Queued       "accepted, awaiting run"
 *   running      -> Running      "executing"
 *   succeeded    -> Completed    "finished OK"
 *   failed       -> Failed       "errored"
 *   needs_review -> Needs Review "ambiguous/blocked, to a human"
 */
const EXACT_STATUS: Record<string, Status> = {
  pending: STATUS.queued,
  running: STATUS.running,
  succeeded: STATUS.completed,
  failed: STATUS.failed,
  needs_review: STATUS.needsReview,
};

/** Readable raw labels for the three the vocabulary does not carry. Explicitly
 *  NOT badges from the §11 set — a raw label is how the UI says "the contract
 *  has a state ONYX does not name". */
const RAW_LABELS: Record<string, string> = {
  deferred: 'Deferred',
  cancelled: 'Cancelled',
  dead: 'Dead (DLQ)',
};

export interface QueueTaskVM {
  readonly id: string;
  readonly type: string;
  /** Always the wire value. */
  readonly rawStatus: string;
  /** The ONYX status when the wire value has an exact equivalent, else null. */
  readonly status: Status | null;
  /** What the UI prints when `status` is null — never a guessed badge. */
  readonly rawStatusLabel: string;
  readonly channelId: string | null;
  readonly attempts: number;
  readonly priority: number | null;
  readonly runAt: string | null;
  readonly createdAt: string;
  readonly error: string | null;
}

export function mapQueueTask(wire: TaskAdminWireDTO): QueueTaskVM {
  const status = EXACT_STATUS[wire.status] ?? null;
  return {
    id: wire.id,
    type: wire.type,
    rawStatus: wire.status,
    status,
    rawStatusLabel: RAW_LABELS[wire.status] ?? wire.status,
    channelId: wire.channel_id ?? null,
    attempts: wire.attempts,
    priority: wire.priority ?? null,
    runAt: wire.run_at ?? null,
    createdAt: wire.created_at,
    // DATABASE_SPEC names the column `last_error`; the FS5 mirror says `error`.
    // Both are read, neither is invented (FE-RV-15).
    error: wire.last_error ?? wire.error ?? null,
  };
}

/** D3 §17's hierarchy: attention first (dead, needs_review, failed), then
 *  running/queued work, then everything settled. Ties break newest-first. */
const ATTENTION_ORDER: readonly string[] = [
  'dead',
  'needs_review',
  'failed',
  'running',
  'pending',
  'deferred',
  'cancelled',
  'succeeded',
];

export function sortQueueTasks(tasks: readonly QueueTaskVM[]): readonly QueueTaskVM[] {
  const rank = (task: QueueTaskVM): number => {
    const index = ATTENTION_ORDER.indexOf(task.rawStatus);
    return index === -1 ? ATTENTION_ORDER.length : index;
  };
  return tasks.slice().sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
}

/** How many rows are asking for a human — the header states it as a fact. */
export function countAttention(tasks: readonly QueueTaskVM[]): number {
  return tasks.filter(
    (t) => t.rawStatus === 'dead' || t.rawStatus === 'needs_review' || t.rawStatus === 'failed',
  ).length;
}

/**
 * Which intents the contract allows for a row. These are UI affordances only —
 * the backend is the boundary (§R10.5) and answers 4xx if it disagrees.
 * `requeue` is the DLQ path (§R8.11) and is offered only for `dead`; `run` is
 * pointless for work already running or settled; `cancel` only applies to work
 * that has not finished.
 */
export function allowedIntents(task: QueueTaskVM): {
  readonly cancel: boolean;
  readonly run: boolean;
  readonly requeue: boolean;
} {
  const s = task.rawStatus;
  return {
    cancel: s === 'pending' || s === 'running' || s === 'deferred' || s === 'needs_review',
    run: s === 'pending' || s === 'deferred' || s === 'failed',
    requeue: s === 'dead',
  };
}
