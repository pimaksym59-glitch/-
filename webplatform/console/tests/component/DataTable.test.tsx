import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';
// Direct import (not the lazy barrel entry) — tests exercise the real module.
import { DataTable } from '@/shared/ui/data-table';
import { expectNoAxeViolations } from '../setup/axe';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly attempts: number;
}

const COLUMNS: readonly ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'attempts', header: 'Attempts', meta: { numeric: true } },
];

const DATA: readonly Row[] = [
  { id: '1', name: 'bravo', attempts: 2 },
  { id: '2', name: 'alpha', attempts: 5 },
  { id: '3', name: 'charlie', attempts: 1 },
];

describe('DataTable (D2 §13.5)', () => {
  it('renders real table semantics with numeric right-alignment', async () => {
    const { container } = render(
      <DataTable label="Jobs" columns={COLUMNS} data={DATA} getRowId={(r) => r.id} />,
    );
    const table = screen.getByRole('table', { name: 'Jobs' });
    expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3
    await expectNoAxeViolations(container);
  });

  it('sorts on header click and announces direction', async () => {
    render(<DataTable label="Jobs" columns={COLUMNS} data={DATA} getRowId={(r) => r.id} />);
    await userEvent.click(screen.getByRole('button', { name: 'Name' }));
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.querySelector('td:nth-child(1)')?.textContent);
    expect(cells).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('selection shows the bulk action bar', async () => {
    render(
      <DataTable
        label="Jobs"
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        enableSelection
        bulkActions={(selected, clear) => (
          <button type="button" onClick={clear}>
            Requeue {selected.length}
          </button>
        )}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByRole('toolbar', { name: /Bulk actions/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Requeue 1' }));
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('activates a row via Enter (keyboard row nav)', async () => {
    const onRowActivate = vi.fn();
    render(
      <DataTable
        label="Jobs"
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        onRowActivate={onRowActivate}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    (rows[0] as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowActivate).toHaveBeenCalledWith(DATA[0]);
  });

  it('renders expandable rows', async () => {
    render(
      <DataTable
        label="Jobs"
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        renderExpanded={(row) => <p>Detail for {row.name}</p>}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0] as HTMLElement);
    expect(screen.getByText('Detail for bravo')).toBeInTheDocument();
  });

  it('honest empty / loading / error states', () => {
    const { rerender } = render(
      <DataTable label="Jobs" columns={COLUMNS} data={[]} emptyTitle="No jobs running" />,
    );
    expect(screen.getByText('No jobs running')).toBeInTheDocument();
    rerender(<DataTable label="Jobs" columns={COLUMNS} data={[]} state="loading" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    rerender(
      <DataTable label="Jobs" columns={COLUMNS} data={[]} state="error" onRetry={() => {}} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('paginates beyond pageSize', async () => {
    const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `row-${i}`,
      attempts: i,
    }));
    render(
      <DataTable label="Jobs" columns={COLUMNS} data={many} getRowId={(r) => r.id} pageSize={25} />,
    );
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });
});
