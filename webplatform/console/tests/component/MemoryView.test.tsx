/**
 * MemoryView integration (FS8 T-FS8.5): RSC initial data → grouped list by
 * KIND, per-role rendering (editor edits, analyst/viewer read), the persona
 * deep link with Style Memory, the Global-scope honest state, and the
 * Memory ≠ Knowledge separation visible in the composition.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapActor } from '@/entities/actor';
import { mapChannel } from '@/entities/channel';
import { mapPersona, sortPersonas } from '@/entities/persona';
import type { Role } from '@/shared/config/rbac';
import {
  ACTORS,
  CHANNELS,
  PERSONAS,
  resetFixturePersonaState,
} from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { MemoryView, type MemoryInitial } from '@/widgets/memory';

const push = vi.fn();
const inspect = vi.fn();
let scopeParam: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('nuqs', () => ({
  useQueryState: (key: string) => [key === 'scope' ? scopeParam : null, vi.fn()],
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

const TECH_PERSONAS = sortPersonas(
  PERSONAS.filter((p) => p.channel_id === 'ch_tech').map(mapPersona),
);
const TECH_ACTORS = ACTORS.filter((a) => a.channel_id === 'ch_tech').map(mapActor);

const INITIAL: MemoryInitial = {
  channels: CHANNELS.map(mapChannel),
  forChannelId: 'ch_tech',
  personas: TECH_PERSONAS,
  actors: TECH_ACTORS,
};

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderMemory(
  role: Role,
  initial: MemoryInitial = INITIAL,
  personaId: string | null = null,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <MemoryView initial={initial} personaId={personaId} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  inspect.mockClear();
  scopeParam = null;
  resetFixturePersonaState();
  useUiStore.setState({ activeChannelId: 'ch_tech', hydrated: true });
});

describe('MemoryView (FS8 T-FS8.5)', () => {
  it('groups memory BY KIND from the initial data (editor)', () => {
    renderMemory('editor');
    expect(screen.getByRole('heading', { level: 1, name: 'Memory' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Persona · the writing voice/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Actors · the visual identity/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Published posts/ })).toBeInTheDocument();
    expect(screen.getByText('The calm senior engineer')).toBeInTheDocument();
    expect(screen.getByText('Nadia, the systems lead')).toBeInTheDocument();
  });

  it('keeps archived personas VISIBLE and labelled (memory is history)', () => {
    renderMemory('editor');
    expect(screen.getByText('Early enthusiast voice')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('`j`/`k` move within a group and the row routes to the persona deep link', async () => {
    renderMemory('editor');
    const first = screen.getByRole('button', { name: /^The calm senior engineer/ });
    first.focus();
    await userEvent.keyboard('j');
    expect(screen.getByRole('button', { name: /^Early enthusiast voice/ })).toHaveFocus();
    await userEvent.keyboard('k');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/memory/persona_tech');
  });

  it('the inspect affordance uses the FS2 URL contract, per kind', async () => {
    renderMemory('editor');
    await userEvent.click(screen.getByRole('button', { name: 'Inspect The calm senior engineer' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'persona', id: 'persona_tech' });
    await userEvent.click(screen.getByRole('button', { name: 'Inspect Nadia, the systems lead' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'actor', id: 'actor_tech' });
  });

  it('analyst reads the workspace: no edit copy for editors, list intact', () => {
    renderMemory('analyst');
    expect(screen.getByText(/editing a persona is an editor operation/)).toBeInTheDocument();
    expect(screen.getByText('The calm senior engineer')).toBeInTheDocument();
  });

  it('the Global scope renders the honest unavailable state, not a fake list', () => {
    scopeParam = 'global';
    renderMemory('editor');
    expect(
      screen.getByRole('heading', { name: 'Global memory is backend-owned' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('The calm senior engineer')).not.toBeInTheDocument();
  });

  it('the persona deep link shows the voice, Style Memory and the AI entry (editor)', async () => {
    renderMemory('editor', INITIAL, 'persona_tech');
    expect(
      await screen.findByRole('heading', { name: 'The calm senior engineer' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Average sentence length')).toBeInTheDocument();
    // The unknown backend key renders honestly by its raw name.
    expect(screen.getByText('hedging_ratio')).toBeInTheDocument();
    expect(screen.getByText('(raw key)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Explain this persona’s voice/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit voice/ })).toBeInTheDocument();
    // The influence trace is honestly absent.
    expect(screen.getByRole('heading', { name: 'Influence trace' })).toBeInTheDocument();
  });

  it('viewer on the persona deep link: content readable, NO edit and NO AI', async () => {
    renderMemory('viewer', INITIAL, 'persona_tech');
    expect(
      await screen.findByRole('heading', { name: 'The calm senior engineer' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit voice/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Explain this persona’s voice/ }),
    ).not.toBeInTheDocument();
  });

  it('a channel with no memory renders the canonical D3 §8 empty state', () => {
    renderMemory('editor', { ...INITIAL, personas: [], actors: [] });
    expect(
      screen.getByRole('heading', { name: 'Memory grows as you publish' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/what will shape Tech Digest's voice/)).toBeInTheDocument();
  });
});
