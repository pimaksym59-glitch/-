import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { mapQueueTask, sortQueueTasks, type TaskAdminWireDTO } from '@/entities/job-queue';
import { queuePaths } from '@/entities/job-queue';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { JobsHonesty, JobsView, type JobsInitial } from '@/widgets/jobs';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Jobs' };

/**
 * Jobs (FS12 T-FS12.8 — D3 §17). RSC initial-data page over the frozen
 * `GET /tasks`, seeded with the SAME filters the URL carries so the first paint
 * matches the requested view rather than an unfiltered list the client would
 * immediately replace.
 *
 * `?channel_id=` is the contract's own filter, not the workspace's active
 * channel: this page never reads the channel cookie.
 */
export default async function JobsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const [params, store] = await Promise.all([searchParams, cookies()]);
  const options = await platformApiOptions(store);

  const one = (value: string | string[] | undefined): string | null =>
    typeof value === 'string' && value !== '' ? value : null;

  const wire = await serverApiOrNull<readonly TaskAdminWireDTO[]>(
    queuePaths.list(one(params['status']), one(params['type']), one(params['channel_id'])),
    options,
  );

  const initial: JobsInitial = {
    tasks: wire ? sortQueueTasks(wire.map(mapQueueTask)) : null,
  };

  return (
    <>
      <JobsView initial={initial} />
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-8 md:px-8">
        {/* Server-rendered: static markup that must not cost the client bundle. */}
        <JobsHonesty />
      </div>
    </>
  );
}
