/**
 * AddSourceDialog (FS7 T-FS7.5): honest per-file states over the real
 * transport composition (POST /documents → assign, via node-MSW over THE
 * dataset) — accepted uploads show Verified (upload truth; ingestion truth is
 * polled on the list), local rejections show the reason, and NO percentage is
 * ever invented.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetFixtureDocumentState } from '@/shared/lib/fixtures/dataset';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { AddSourceDialog } from '@/features/add-source';

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
            <StreamingProvider>
              <AddSourceDialog
                open
                onOpenChange={() => undefined}
                channelId="ch_tech"
                channelName="Tech Digest"
              />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function fileInput(): HTMLInputElement {
  const input = screen.getByLabelText(/Markdown, text, HTML or PDF/, {
    selector: 'input[type="file"]',
  });
  return input as HTMLInputElement;
}

beforeEach(() => {
  resetFixtureDocumentState();
});

describe('AddSourceDialog (FS7 T-FS7.5)', () => {
  it('uploads a text source: accepted → Verified chip + honest ingest copy; no % anywhere', async () => {
    renderDialog();
    const file = new File(['# Notes\n\nBody.'], 'notes.md', { type: 'text/markdown' });
    // fireEvent bypasses userEvent's accept pre-filtering (FS3 lesson).
    fireEvent.change(fileInput(), { target: { files: [file] } });

    expect(await screen.findByText('notes.md')).toBeInTheDocument();
    expect(await screen.findByText('Verified', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/ingestion continues server-side/)).toBeInTheDocument();
    // Honesty: the transport exposes no progress — no percentage is shown.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('rejects an unsupported type locally with the reason and a retry-free error row', async () => {
    renderDialog();
    const bad = new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput(), { target: { files: [bad] } });

    expect(await screen.findByText('virus.exe')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported file type');
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('the dialog names the channel isolation truth', () => {
    renderDialog();
    expect(screen.getByText(/Uploads into “Tech Digest”/)).toBeInTheDocument();
  });
});
