/**
 * StudioView integration (FS9 T-FS9.5): RSC initial data → hydrated grid,
 * per-role rendering (editor regenerates, analyst/viewer read-only), the
 * honesty surfaces that replace what the contract cannot back, `j/k`
 * navigation, the references panel and the canonical D2 §15 empty state.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapChannel } from '@/entities/channel';
import { mapImage } from '@/entities/image';
import type { Role } from '@/shared/config/rbac';
import { CHANNELS, IMAGES, resetFixtureImageState } from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { StudioView, type StudioInitial } from '@/widgets/studio';

const push = vi.fn();
const inspect = vi.fn();
let panelValue: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('nuqs', () => ({
  useQueryState: (key: string) => [key === 'panel' ? panelValue : null, vi.fn()],
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

const TECH_IMAGES = IMAGES.filter((image) => image.channel_id === 'ch_tech').map(mapImage);

const INITIAL: StudioInitial = {
  channels: CHANNELS.map(mapChannel),
  forChannelId: 'ch_tech',
  images: TECH_IMAGES,
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

function renderStudio(role: Role, initial: StudioInitial = INITIAL, imageId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <StudioView initial={initial} imageId={imageId} />
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
  panelValue = null;
  resetFixtureImageState();
  useUiStore.setState({ activeChannelId: 'ch_tech', hydrated: true });
});

describe('StudioView (FS9 T-FS9.5)', () => {
  it('renders the channel-scoped record grid from initial data (editor)', () => {
    renderStudio('editor');
    expect(screen.getByRole('heading', { level: 1, name: 'Image Studio' })).toBeInTheDocument();
    const grid = screen.getByRole('list', { name: 'Image records' });
    expect(grid).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open image record img_tech_1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open image record img_tech_2' }),
    ).toBeInTheDocument();
  });

  it('renders wire-derived chips only — Verified and Needs Review, never “Safety ok”', () => {
    renderStudio('editor');
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.queryByText(/safety ok/i)).not.toBeInTheDocument();
  });

  it('surfaces an unknown wire status raw instead of coercing it', () => {
    renderStudio('editor');
    expect(screen.getByText('post_processing')).toBeInTheDocument();
  });

  it('never renders a preview image or a storage path', () => {
    const { container } = renderStudio('editor');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText(/channels\/ch_tech\/images/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Stored in object storage').length).toBeGreaterThan(0);
  });

  it('offers no generation composer and no attach affordance (honest seams instead)', () => {
    renderStudio('editor');
    expect(screen.queryByRole('button', { name: /^generate$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /attach to post/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^accept$/i })).not.toBeInTheDocument();
    // The seam renders twice by design: once beside the grid (below xl, where
    // the detail pane is hidden) and once in the detail placeholder.
    expect(
      screen.getAllByRole('heading', { name: 'Generation runs in the pipeline, not here' }).length,
    ).toBeGreaterThan(0);
  });

  it('analyst reads read-only: honest copy, records still visible', () => {
    renderStudio('analyst');
    expect(
      screen.getByText(/regenerating and uploading references are editor operations/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open image record img_tech_1' }),
    ).toBeInTheDocument();
  });

  it('`j`/`k` move between cards and the Inspector affordance uses the URL contract', async () => {
    renderStudio('editor');
    const first = screen.getByRole('button', { name: 'Open image record img_tech_1' });
    first.focus();
    await userEvent.keyboard('j');
    expect(screen.getByRole('button', { name: 'Open image record img_tech_2' })).toHaveFocus();
    await userEvent.keyboard('k');
    expect(first).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Inspect image record img_tech_1' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'image', id: 'img_tech_1' });
  });

  it('opening a card routes to the record deep link (§3.5)', async () => {
    renderStudio('editor');
    await userEvent.click(screen.getByRole('button', { name: 'Open image record img_tech_1' }));
    expect(push).toHaveBeenCalledWith('/studio/img_tech_1');
  });

  it('a confirmed empty list renders the D2 §15 empty state plus the generation seam', () => {
    renderStudio('editor', { ...INITIAL, images: [] });
    expect(
      screen.getByRole('heading', { name: 'No images for this channel yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set up actor references' })).toBeInTheDocument();
  });

  it('the references panel is the identity-inputs surface (§R6.1)', async () => {
    panelValue = 'references';
    renderStudio('editor');
    expect(await screen.findByRole('heading', { name: 'Actor references' })).toBeInTheDocument();
    expect(
      screen.getByText(/identity conditioning, not a text description and not a seed/i),
    ).toBeInTheDocument();
  });

  it('the references panel is read-only for an analyst', async () => {
    panelValue = 'references';
    renderStudio('analyst');
    expect(await screen.findByRole('heading', { name: 'Actor references' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add references' })).not.toBeInTheDocument();
    expect(screen.getByText(/uploading references is an editor operation/i)).toBeInTheDocument();
  });
});
