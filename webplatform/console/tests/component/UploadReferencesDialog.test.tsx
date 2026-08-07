/**
 * UploadReferencesDialog (FS9 T-FS9.7 — the stage's entry duty). The honest
 * upload machine: an accepted file shows **Verified** (the upload succeeded),
 * a rejected one shows its reason — and **no percentage appears anywhere**,
 * because `fetch` reports no upload progress (the FS7 rule, re-proved here).
 * The §R6.1/§R6.2 truths are stated in copy.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { mapActor } from '@/entities/actor';
import { UploadReferencesDialog } from '@/features/upload-references';
import { ACTORS, resetFixtureImageState } from '@/shared/lib/fixtures/dataset';
import { AccessibilityProvider, AuthProvider, NotificationProvider } from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

const wire = ACTORS.find((actor) => actor.channel_id === 'ch_tech');
if (!wire) throw new Error('fixture must model a ch_tech actor');
const ACTOR = mapActor(wire);

const SESSION: SessionDTO = {
  userId: 'usr_editor',
  email: 'editor@console.local',
  displayName: 'Console editor',
  role: 'editor',
  mfaEnabled: false,
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={SESSION}>
        <AccessibilityProvider>
          <NotificationProvider>
            <UploadReferencesDialog
              open
              onOpenChange={() => undefined}
              actor={ACTOR}
              channelId="ch_tech"
            />
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFixtureImageState();
});

/** The dialog renders in a portal — reach the input by its label (FS7 lesson). */
function fileInput(): HTMLInputElement {
  return screen.getByLabelText(/PNG, JPEG or WebP/, {
    selector: 'input[type="file"]',
  }) as HTMLInputElement;
}

describe('UploadReferencesDialog (FS9 T-FS9.7)', () => {
  it('states the §R6.1 and §R6.2 truths', () => {
    renderDialog();
    expect(
      screen.getByText(/identity conditioning, not a text description and not a seed/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Actors are fictional characters/)).toBeInTheDocument();
    expect(screen.getByText(/Do not upload photographs of real people/)).toBeInTheDocument();
  });

  it('an accepted upload shows Verified — and no percentage is ever rendered', async () => {
    const { baseElement } = renderDialog();
    const file = new File(['bytes'], 'face-front.png', { type: 'image/png' });
    await userEvent.upload(fileInput(), file, { applyAccept: false });

    expect(await screen.findByText('Verified', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/1 reference accepted/)).toBeInTheDocument();
    // No invented progress: neither a percentage nor a progressbar exists.
    expect(baseElement.textContent).not.toMatch(/\d+\s?%/);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('locally rejects a non-image file with its reason', async () => {
    const { baseElement } = renderDialog();
    await userEvent.upload(fileInput(), new File(['x'], 'notes.txt', { type: 'text/plain' }), {
      applyAccept: false,
    });

    await waitFor(() => expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument());
    expect(baseElement.textContent).not.toMatch(/\d+\s?%/);
  });
});
