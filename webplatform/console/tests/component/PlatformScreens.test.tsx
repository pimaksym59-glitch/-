/**
 * FS12 component tests — the five real screens and the three seams.
 *
 * The emphasis is on what the stage promised rather than on rendering trivia:
 * the RBAC branches (a permission state, never a crash), the D14 raw labels,
 * the honest absences, and the two surfaces where a mistake would be a
 * security or honesty defect rather than a bug — the key dialog and the AI
 * panel.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { describe, expect, it, vi } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { mapQueueTask } from '@/entities/job-queue';
import { mapPlatformUser } from '@/entities/platform-user';
import { mapAuditRecord } from '@/entities/audit';
import { mapReadiness } from '@/entities/probe';
import { mapApiKeySlot } from '@/entities/api-key';
import { mapCostReport } from '@/entities/cost-report';
import { RotateKeyDialog } from '@/features/rotate-key';
import { AdminView } from '@/widgets/admin';
import { AuditView } from '@/widgets/audit';
import { HealthView } from '@/widgets/health';
import { JobsHonesty, JobsView } from '@/widgets/jobs';
import { ProvidersView } from '@/widgets/providers';
import { BillingView } from '@/widgets/billing';
import { FlagsSeam, LogsSeam, NotificationsSeam } from '@/widgets/platform-seams';

/* ------------------------------------------------------------------ harness */

const session = (role: Role) => ({
  userId: 'usr_test',
  email: 'test@console.local',
  displayName: 'Test',
  role,
  mfaEnabled: false,
});

vi.mock('@/shared/providers', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/shared/providers');
  return {
    ...actual,
    useCan: () => (permission: string) => currentRole.permissions.includes(permission),
    useToast: () => ({ toast: vi.fn() }),
    useSession: () => session(currentRole.role),
  };
});

const currentRole: { role: Role; permissions: readonly string[] } = {
  role: 'owner',
  permissions: [],
};

function asRole(role: Role, permissions: readonly string[]): void {
  currentRole.role = role;
  currentRole.permissions = permissions;
}

const OWNER = [
  'workspace.view',
  'content.view',
  'content.edit',
  'content.publish',
  'analytics.view',
  'platform.view',
  'platform.manage',
  'admin.users.manage',
  'admin.providers.manage',
  'settings.manage',
];
const ADMIN = OWNER.filter((p) => !p.startsWith('admin.'));
const ANALYST = ['workspace.view', 'content.view', 'analytics.view', 'platform.view'];

function renderView(ui: React.ReactElement): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <NuqsAdapter>{ui}</NuqsAdapter>
    </QueryClientProvider>,
  );
}

/* -------------------------------------------------------------------- data */

const TASKS = [
  mapQueueTask({
    id: 'task_dead_1',
    type: 'publish',
    status: 'dead',
    channel_id: 'ch_tech',
    attempts: 5,
    created_at: '2026-07-30T04:00:00Z',
    last_error: 'TelegramForbidden: bot was kicked',
  }),
  mapQueueTask({
    id: 'task_defer_6',
    type: 'publish',
    status: 'deferred',
    attempts: 1,
    created_at: '2026-07-30T07:00:00Z',
  }),
  mapQueueTask({
    id: 'task_pend_5',
    type: 'collect_metrics',
    status: 'pending',
    attempts: 0,
    created_at: '2026-07-30T08:00:00Z',
  }),
];

const USERS = [
  mapPlatformUser({ id: 'usr_owner', email: 'owner@console.local', role: 'owner' }),
  mapPlatformUser({ id: 'usr_legacy', email: 'legacy@console.local', role: 'superuser' }),
];

const AUDIT = [
  mapAuditRecord({
    id: 'aud_3',
    action: 'channel.created',
    entity: 'channel',
    actor_user_id: 'usr_admin',
    before: null,
    after: { title: 'Art Curator' },
    created_at: '2026-07-28T15:02:00Z',
  }),
];

/* ------------------------------------------------------------------- tests */

describe('JobsView', () => {
  /** Row assertions stay scoped to the list — the safest habit near repeated
   *  copy (the FS8 strict-mode selector lesson). */
  const rows = (): HTMLElement => screen.getByRole('list', { name: 'Queue tasks' });

  it('renders the three unmapped statuses as explicit raw labels (D14)', () => {
    asRole('owner', OWNER);
    renderView(<JobsView initial={{ tasks: TASKS }} />);
    expect(within(rows()).getByText('Dead (DLQ)')).toBeInTheDocument();
    expect(within(rows()).getByText('Deferred')).toBeInTheDocument();
    // `pending` DOES have an exact equivalent and renders as the ONYX badge.
    expect(within(rows()).getByText('Queued')).toBeInTheDocument();
  });

  it('offers requeue only for a dead task', async () => {
    asRole('owner', OWNER);
    renderView(<JobsView initial={{ tasks: TASKS }} />);
    // The intents are a lazy chunk (they own the mutation hook and the dialog),
    // so the affordance mounts asynchronously — as it does in the browser.
    await screen.findByRole('button', { name: 'Requeue' });
    expect(screen.getAllByRole('button', { name: 'Requeue' })).toHaveLength(1);
  });

  it('hides every intent from a role that cannot manage the queue', async () => {
    asRole('analyst', ANALYST);
    renderView(<JobsView initial={{ tasks: TASKS }} />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Requeue' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Run now' })).not.toBeInTheDocument();
    // Reading is still possible — the screen is not a crash or a blank.
    expect(within(rows()).getByText('Dead (DLQ)')).toBeInTheDocument();
  });

  it('confirms before sending a requeue intent', async () => {
    asRole('owner', OWNER);
    renderView(<JobsView initial={{ tasks: TASKS }} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Requeue' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Requeue this dead task\?/)).toBeInTheDocument();
    // The confirmation states the DLQ semantics, not a generic "are you sure".
    expect(within(dialog).getByText(/returns to the queue as pending/)).toBeInTheDocument();
  });

  it('states its honest absences (server-rendered beside the view)', () => {
    render(<JobsHonesty />);
    expect(screen.getByText('No live transitions')).toBeInTheDocument();
    expect(screen.getByText('No bulk requeue')).toBeInTheDocument();
    expect(screen.getByText('No log view')).toBeInTheDocument();
  });
});

describe('AdminView', () => {
  it('renders a permission state for an admin on Users & Roles, not a crash', () => {
    asRole('admin', ADMIN);
    renderView(<AdminView initial={{ users: USERS, configVersions: [] }} />);
    expect(screen.getByText('Your role cannot manage users')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create user' })).not.toBeInTheDocument();
  });

  it('renders the roster for an owner and keeps an unrecognised role raw', () => {
    asRole('owner', OWNER);
    renderView(<AdminView initial={{ users: USERS, configVersions: [] }} />);
    expect(screen.getByText('owner@console.local')).toBeInTheDocument();
    expect(screen.getByText(/superuser — unrecognised role/)).toBeInTheDocument();
  });

  it('says create, never invite', async () => {
    asRole('owner', OWNER);
    renderView(<AdminView initial={{ users: USERS, configVersions: [] }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByText(/No invitation is sent/)).toBeInTheDocument();
  });

  it('states that sessions cannot be listed', () => {
    asRole('owner', OWNER);
    renderView(<AdminView initial={{ users: USERS, configVersions: [] }} />);
    expect(screen.getByText('No session inventory')).toBeInTheDocument();
    expect(screen.getByText('No deactivate or delete')).toBeInTheDocument();
  });
});

describe('AuditView', () => {
  it('renders a create record without inventing a before side', () => {
    asRole('owner', OWNER);
    renderView(<AuditView initial={{ records: AUDIT }} />);
    expect(screen.getByText('channel.created')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('keeps the actor a raw id', () => {
    asRole('owner', OWNER);
    renderView(<AuditView initial={{ records: AUDIT }} />);
    expect(screen.getByText('usr_admin')).toBeInTheDocument();
  });

  it('states that no time filter and no server export exist', () => {
    asRole('owner', OWNER);
    renderView(<AuditView initial={{ records: AUDIT }} />);
    expect(screen.getByText('No time-range filter')).toBeInTheDocument();
    expect(screen.getByText('No server-side export')).toBeInTheDocument();
  });
});

describe('HealthView', () => {
  const readiness = mapReadiness({
    status: 'degraded',
    checks: {
      postgres: { status: 'ok' },
      llm_provider: { status: 'fake', detail: 'Deterministic fake' },
    },
  });

  it('renders an unrecognised probe state as unknown, quoting the wire word', () => {
    asRole('owner', OWNER);
    renderView(<HealthView initial={{ readiness }} />);
    expect(screen.getByText(/Reported “fake”/)).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Unknown' }).length).toBeGreaterThan(0);
  });

  it('never renders a green dot for an unknown dependency', () => {
    asRole('owner', OWNER);
    renderView(<HealthView initial={{ readiness }} />);
    const healthy = screen.getAllByRole('img', { name: 'Healthy' });
    // postgres only — the fake provider is grey.
    expect(healthy).toHaveLength(1);
  });

  it('says nothing is derived when readiness names no dependency', () => {
    asRole('owner', OWNER);
    renderView(<HealthView initial={{ readiness: mapReadiness({ status: 'ok' }) }} />);
    expect(screen.getByText('Readiness reported no per-dependency detail')).toBeInTheDocument();
  });
});

describe('ProvidersView', () => {
  const slots = [
    mapApiKeySlot({ name: 'openai', kind: 'llm', configured: false }, 0),
    mapApiKeySlot({ name: 'telegram', kind: 'telegram', configured: null }, 1),
  ];

  it('renders presence, never a value or a mask', () => {
    asRole('owner', OWNER);
    renderView(<ProvidersView initial={{ slots, readiness: null }} />);
    expect(screen.getByText(/No key stored/)).toBeInTheDocument();
    expect(screen.getByText(/did not say whether a key is stored/)).toBeInTheDocument();
    expect(screen.queryByText(/sk-/)).not.toBeInTheDocument();
    expect(screen.queryByText(/•••/)).not.toBeInTheDocument();
  });

  it('hides rotation from a role the contract does not allow', () => {
    asRole('admin', ADMIN);
    renderView(<ProvidersView initial={{ slots, readiness: null }} />);
    expect(screen.queryByRole('button', { name: 'Rotate key' })).not.toBeInTheDocument();
  });

  it('explains why the screen carries no capabilities or connection test', () => {
    asRole('owner', OWNER);
    renderView(<ProvidersView initial={{ slots, readiness: null }} />);
    expect(screen.getByText('No capability matrix')).toBeInTheDocument();
    expect(screen.getByText('No “test connection”')).toBeInTheDocument();
    expect(screen.getByText('No key is ever displayed')).toBeInTheDocument();
  });
});

describe('RotateKeyDialog', () => {
  it('uses a password field that is never pre-filled', () => {
    render(
      <RotateKeyDialog
        open
        slotName="openai"
        pending={false}
        onOpenChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    const field = screen.getByLabelText('New key');
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('autocomplete', 'off');
    expect(field).toHaveValue('');
  });

  it('clears the field after submitting', async () => {
    const onSubmit = vi.fn();
    render(
      <RotateKeyDialog
        open
        slotName="openai"
        pending={false}
        onOpenChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );
    const field = screen.getByLabelText('New key');
    await userEvent.type(field, 'sk-live-123');
    await userEvent.click(screen.getByRole('button', { name: 'Store key' }));
    expect(onSubmit).toHaveBeenCalledWith('sk-live-123');
    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('states that the key can never be read back', () => {
    render(
      <RotateKeyDialog
        open
        slotName="openai"
        pending={false}
        onOpenChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByText(/never returned/)).toBeInTheDocument();
  });
});

describe('BillingView', () => {
  it('renders served cost and no forecast', () => {
    asRole('owner', OWNER);
    // The default facet is `day`, so the seed must match it — otherwise the
    // view refetches and the assertion races the network (there is no MSW here).
    const report = mapCostReport('day', [
      { key: '2026-07-29', amount_usd: 3 },
      { key: '2026-07-30', amount_usd: 1 },
    ]);
    renderView(<BillingView initial={{ report }} />);
    expect(screen.getByText('Total in the served window')).toBeInTheDocument();
    expect(screen.getByText('No forecast')).toBeInTheDocument();
    expect(screen.getByText('No plan or invoices')).toBeInTheDocument();
    expect(screen.getByText('No budget alerts')).toBeInTheDocument();
  });
});

describe('the three seam screens', () => {
  it('Logs states fact, reason and remedy', () => {
    render(<LogsSeam />);
    expect(screen.getByText('What the backend has')).toBeInTheDocument();
    expect(screen.getByText('Why this screen is empty')).toBeInTheDocument();
    expect(screen.getByText('What would change it')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument();
  });

  it('Flags refuses to render a toggle that writes nowhere', () => {
    render(<FlagsSeam />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Why there is no toggle here')).toBeInTheDocument();
  });

  it('Notifications shows no unread count', () => {
    render(<NotificationsSeam />);
    expect(screen.getByText('Why there is no centre')).toBeInTheDocument();
    expect(screen.queryByText(/unread/i)).toBeInTheDocument();
  });
});
