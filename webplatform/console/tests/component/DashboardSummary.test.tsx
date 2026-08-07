/**
 * DashboardSummary (FS6 T-FS6.9): NOTHING auto-runs on mount (owner condition
 * 4), an explicit click streams the deterministic summary with Trust +
 * Explainability + wire cost, and read-only roles get the honest state
 * without a generate affordance.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { AccessibilityProvider, AuthProvider, StreamingProvider } from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { DashboardSummary } from '@/widgets/dashboard';

// The markdown renderer is a lazy heavy module — content passthrough is enough.
vi.mock('@/shared/ui/markdown/lazy', () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderCard(role: Role): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <StreamingProvider>
            <DashboardSummary channelId="ch_tech" channelName="Tech Digest" />
          </StreamingProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('DashboardSummary (FS6 T-FS6.9)', () => {
  it('NEVER auto-runs: mounting renders the explicit-action state only', () => {
    renderCard('owner');
    expect(
      screen.getByRole('heading', { level: 2, name: '“What changed today?”' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/only when you ask,\s*never automatically/)).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-summary-output')).not.toBeInTheDocument();
  });

  it('an explicit click streams the summary with Trust, Explainability and wire cost', async () => {
    renderCard('owner');
    await userEvent.click(screen.getByRole('button', { name: /Generate summary/ }));

    // Wait for the DONE marker (wire cost renders only on completion) — the
    // streaming node is transient and gets replaced, so anchor on the end
    // state before asserting content.
    expect(await screen.findByText('$0.0042')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic fixture reply/)).toBeInTheDocument();
    // Trust label (Generated + sourcing state) — D1 A6/A7.
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Source available')).toBeInTheDocument();

    // Explainability: gated metrics are named as EXCLUDED (§R10.3).
    await userEvent.click(screen.getByRole('button', { name: /Why this output/ }));
    expect(screen.getByText(/views, reactions/)).toBeInTheDocument();
    expect(screen.getByText(/excluded from the input/)).toBeInTheDocument();
  });

  it('read-only roles get the honest editor-action state, no button', () => {
    renderCard('viewer');
    expect(screen.queryByRole('button', { name: /Generate summary/ })).not.toBeInTheDocument();
    expect(screen.getByText(/editor action/)).toBeInTheDocument();
  });
});
