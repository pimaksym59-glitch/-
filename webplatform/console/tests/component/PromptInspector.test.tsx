/**
 * PromptInspector (FS10 T-FS10.7/T-FS10.11) behind the unchanged FS2
 * `?inspect=prompt:<rowId>` contract. There is no `GET /prompts/{id}`, so the
 * row is resolved from its own version chain — and the view must carry no
 * Active/Draft badge, no variables count, no author name and no destructive
 * action, because the contract backs none of them.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { resetFixturePromptState } from '@/shared/lib/fixtures/dataset';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { PromptInspector } from '@/widgets/inspector/PromptInspector';

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderInspector(id: string, role: Role = 'editor') {
  resetFixturePromptState();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <PromptInspector id={id} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('PromptInspector (FS10 T-FS10.7)', () => {
  it('resolves the row from its version chain and shows its real metadata', async () => {
    renderInspector('prm_system_2');
    expect(await screen.findByRole('heading', { name: /System\s*v2/ })).toBeInTheDocument();
    expect(screen.getByText('3 versions in this chain')).toBeInTheDocument();
    expect(screen.getByText('usr_owner')).toBeInTheDocument();
    expect(screen.getByText('claude-opus-4-8')).toBeInTheDocument();
    expect(screen.getByText(/Vary structure, opening and closing/)).toBeVisible();
  });

  it('renders no activation badge, no variables count and no destructive action', async () => {
    renderInspector('prm_system_2');
    await screen.findByRole('heading', { name: /System\s*v2/ });
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ variables?/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete|promote|rename/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an unrecognised type by its raw value', async () => {
    renderInspector('prm_unknown_1');
    expect(await screen.findByText('raw type “weekly_digest”')).toBeInTheDocument();
  });

  it('states the append-only, platform-wide truth', async () => {
    renderInspector('prm_morning_1');
    expect(
      await screen.findByText(/Prompts are platform-wide and append-only/),
    ).toBeInTheDocument();
  });
});
