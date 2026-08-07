/**
 * ExplainStylePanel (FS8 T-FS8.9): NOTHING auto-runs; the answer streams over
 * the MSW SSE relay and finishes with wire cost; it carries Trust (Generated ·
 * Source Available) and a **MemoryCard citing the REAL persona record**, with
 * confidence honestly absent and **no influence claim anywhere**.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapPersona } from '@/entities/persona';
import { ExplainStylePanel } from '@/features/explain-style';
import { PERSONAS } from '@/shared/lib/fixtures/dataset';
import { useAssistantStore } from '@/shared/lib/stream';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

const inspect = vi.fn();

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

vi.mock('@/shared/ui/markdown/lazy', () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

const wire = PERSONAS.find((p) => p.id === 'persona_tech');
if (!wire) throw new Error('fixture must model persona_tech');
const PERSONA = mapPersona(wire);

const SESSION: SessionDTO = {
  userId: 'usr_editor',
  email: 'editor@console.local',
  displayName: 'Console editor',
  role: 'editor',
  mfaEnabled: false,
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={SESSION}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <ExplainStylePanel persona={PERSONA} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inspect.mockClear();
  useAssistantStore.setState({ slices: {}, stops: {} });
});

describe('ExplainStylePanel (FS8 T-FS8.9)', () => {
  it('renders idle with NO output — nothing auto-runs (cost honesty)', () => {
    renderPanel();
    expect(screen.getByText(/when you ask, never\s+automatically/)).toBeInTheDocument();
    expect(screen.queryByTestId('explain-style-output')).not.toBeInTheDocument();
  });

  it('streams to done with wire cost, Trust and a MemoryCard citing the persona', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Explain the voice' }));

    // Anchor on the DONE marker (wire cost) — the streaming node is replaced.
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();
    // The fixture echoes the first prompt line — the persona prompt crossed the wire.
    expect(
      screen.getByText(/You asked: Answer a question about ONE writing persona/),
    ).toBeInTheDocument();

    // Trust + provenance: the card carries the REAL persona record.
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Persona')).toBeInTheDocument();
    expect(screen.getByText(/Short declarative sentences/)).toBeInTheDocument();
    expect(screen.getByText(/7 derived style features included/)).toBeInTheDocument();

    // The card opens the source record in the Inspector (provenance, not a claim).
    await userEvent.click(screen.getByRole('button', { name: 'Open in Memory Explorer' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'persona', id: 'persona_tech' });
  });

  it('explainability states the attribution limit; confidence stays absent', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Explain the voice' }));
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Why this output/ }));
    expect(screen.getByText(/Nothing else entered the prompt/)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot tell you which memory shaped a specific post/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });
});
