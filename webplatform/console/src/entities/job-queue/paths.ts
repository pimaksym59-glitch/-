/**
 * The frozen §Scheduler & Tasks calls, verbatim (API_SPEC "Scheduler & Tasks
 * (§R8; owner/admin)"). Entity-local.
 *
 *   GET  /tasks?status=&type=&channel_id=   the Task Monitor (§R10.6)
 *   GET  /tasks/{id}                        one task
 *   POST /tasks/{id}/cancel                 cancelled
 *   POST /tasks/{id}/run                    manual run
 *   POST /tasks/{id}/requeue                DLQ dead to pending (§R8.11)
 *
 * Deliberately absent: any bulk path (none exists; §R10.7 bulk work is queued
 * per item and the UI cannot verify per-bot limits — plan §8), and any
 * schedules write (that is the Channels screen's business, not FS12's).
 */
export const queuePaths = {
  list: (status?: string | null, type?: string | null, channelId?: string | null) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (channelId) params.set('channel_id', channelId);
    const query = params.toString();
    return query === '' ? '/tasks' : `/tasks?${query}`;
  },
  detail: (id: string) => `/tasks/${encodeURIComponent(id)}`,
  cancel: (id: string) => `/tasks/${encodeURIComponent(id)}/cancel`,
  run: (id: string) => `/tasks/${encodeURIComponent(id)}/run`,
  requeue: (id: string) => `/tasks/${encodeURIComponent(id)}/requeue`,
} as const;
