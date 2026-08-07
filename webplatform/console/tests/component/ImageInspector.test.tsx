/**
 * ImageInspector (FS9 T-FS9.8) behind the unchanged `?inspect=image:<id>`
 * contract: the record projection, the RBAC split, the queued-truth wording of
 * the 202 regeneration intent and the guarded (confirmed) soft delete.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { resetFixtureImageState } from '@/shared/lib/fixtures/dataset';
import { AccessibilityProvider, AuthProvider, NotificationProvider } from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
// Deep import on purpose: the view is a LAZY registry row and must NOT be
// re-exported from the widget barrel (that barrel sits in the shell commons).
import { ImageInspector } from '@/widgets/inspector/ImageInspector';

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderInspector(role: Role, id = 'img_tech_1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <ImageInspector id={id} />
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFixtureImageState();
});

describe('ImageInspector (FS9 T-FS9.8)', () => {
  it('renders the record with its parameters and the no-preview truth', async () => {
    const { container } = renderInspector('editor');
    expect(await screen.findByText('img_tech_1', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('812004')).toBeInTheDocument();
    expect(screen.getByText(/the API contract exposes no\s+media URL/)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('a viewer sees the record but no write intents (SEC-7)', async () => {
    renderInspector('viewer');
    expect(await screen.findByText('img_tech_1', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete image record' })).not.toBeInTheDocument();
  });

  it('regeneration reports the QUEUED truth, never “done” (§R10.1)', async () => {
    renderInspector('editor');
    expect(await screen.findByText('img_tech_1', undefined, { timeout: 5000 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    const toast = await screen.findAllByText('Regeneration queued', undefined, { timeout: 5000 });
    expect(toast.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/task task_regen_img_tech_1/).length).toBeGreaterThan(0);
  });

  it('delete is guarded by a confirm dialog before anything happens', async () => {
    renderInspector('editor');
    expect(await screen.findByText('img_tech_1', undefined, { timeout: 5000 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete image record' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/soft-deleted/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const toast = await screen.findAllByText('Image deleted', undefined, { timeout: 5000 });
    expect(toast.length).toBeGreaterThan(0);
  });
});
