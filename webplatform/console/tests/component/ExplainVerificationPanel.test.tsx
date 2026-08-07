/**
 * ExplainVerificationPanel (FS9 T-FS9.9): NOTHING auto-runs; the answer streams
 * over the MSW SSE relay and finishes with wire cost; it carries Trust
 * (Generated · Source Available) and a card citing the **REAL image record**,
 * with confidence honestly absent and **no safety or identity claim anywhere**.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapImage, mapSimilarityReport } from '@/entities/image';
import { ExplainVerificationPanel } from '@/features/explain-verification';
import { IMAGES, IMAGE_SIMILARITY } from '@/shared/lib/fixtures/dataset';
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

const wire = IMAGES.find((image) => image.id === 'img_tech_1');
if (!wire) throw new Error('fixture must model img_tech_1');
const IMAGE = mapImage(wire);
const REPORT = mapSimilarityReport(IMAGE_SIMILARITY.img_tech_1);

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
              <ExplainVerificationPanel image={IMAGE} report={REPORT} />
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

describe('ExplainVerificationPanel (FS9 T-FS9.9)', () => {
  it('renders idle with NO output — nothing auto-runs (cost honesty)', () => {
    renderPanel();
    expect(screen.getByText(/when you\s+ask, never automatically/)).toBeInTheDocument();
    expect(screen.queryByTestId('explain-verification-output')).not.toBeInTheDocument();
  });

  it('streams to done with wire cost, Trust and a card citing the image record', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Explain the checks' }));

    // Anchor on the DONE marker (wire cost) — the streaming node is replaced.
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();
    // The fixture echoes the first prompt line — the image prompt crossed the wire.
    expect(
      screen.getByText(/You asked: Answer a question about ONE generated image/),
    ).toBeInTheDocument();

    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Image record img_tech_1')).toBeInTheDocument();

    // The card opens the source record in the Inspector (provenance, not a claim).
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'image', id: 'img_tech_1' });
  });

  it('explainability states the verification limit; confidence stays absent', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Explain the checks' }));
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Why this output/ }));
    expect(screen.getByText(/Nothing else entered the prompt/)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot tell you whether the image passed safety checks/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });
});
