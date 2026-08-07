import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDef } from '@tanstack/react-table';
import { STATUS, type Status } from '@/shared/types/status';
import { StatusBadge } from '../badge/Badge';
import { Button } from '../button';
import { DataTable } from './DataTable';

interface JobRow {
  readonly id: string;
  readonly job: string;
  readonly channel: string;
  readonly status: Status;
  readonly attempts: number;
}

const COLUMNS: readonly ColumnDef<JobRow, unknown>[] = [
  { accessorKey: 'job', header: 'Job' },
  { accessorKey: 'channel', header: 'Channel' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: 'attempts', header: 'Attempts', meta: { numeric: true } },
];

const DATA: readonly JobRow[] = [
  { id: '1', job: 'generate_post', channel: 'Tech Digest', status: STATUS.running, attempts: 1 },
  { id: '2', job: 'publish_post', channel: 'Daily Brief', status: STATUS.completed, attempts: 1 },
  { id: '3', job: 'generate_image', channel: 'Art Curator', status: STATUS.failed, attempts: 3 },
  { id: '4', job: 'reindex_knowledge', channel: 'Tech Digest', status: STATUS.queued, attempts: 0 },
];

const meta: Meta<typeof DataTable<JobRow>> = {
  title: 'ONYX/Data/DataTable',
  component: DataTable<JobRow>,
};
export default meta;
type Story = StoryObj<typeof DataTable<JobRow>>;

export const Default: Story = {
  render: () => (
    <DataTable
      label="Jobs"
      columns={COLUMNS}
      data={DATA}
      getRowId={(r) => r.id}
      onRowActivate={() => {}}
    />
  ),
};
export const WithSelectionAndBulkBar: Story = {
  render: () => (
    <DataTable
      label="Jobs"
      columns={COLUMNS}
      data={DATA}
      getRowId={(r) => r.id}
      enableSelection
      bulkActions={(selected, clear) => (
        <>
          <Button size="sm" variant="secondary" onClick={clear}>
            Requeue {selected.length}
          </Button>
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </>
      )}
    />
  ),
};
export const Expandable: Story = {
  render: () => (
    <DataTable
      label="Jobs"
      columns={COLUMNS}
      data={DATA}
      getRowId={(r) => r.id}
      renderExpanded={(row) => (
        <p className="text-[13px] text-secondary">
          {row.job} · last attempt payload, timings and error detail render here.
        </p>
      )}
    />
  ),
};
export const Loading: Story = {
  render: () => <DataTable label="Jobs" columns={COLUMNS} data={[]} state="loading" />,
};
export const ErrorRow: Story = {
  render: () => (
    <DataTable label="Jobs" columns={COLUMNS} data={[]} state="error" onRetry={() => {}} />
  ),
};
export const Empty: Story = {
  render: () => (
    <DataTable
      label="Jobs"
      columns={COLUMNS}
      data={[]}
      emptyTitle="No jobs running"
      emptyDescription="Scheduled work will appear here."
    />
  ),
};
