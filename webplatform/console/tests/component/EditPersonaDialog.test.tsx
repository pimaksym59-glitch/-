/**
 * EditPersonaDialog (FS8 T-FS8.6): guarded voice editing over the real PATCH
 * (node-MSW over THE dataset) — the audit truth is stated, style features are
 * explicitly read-only, archive is confirmed, and a STALE optimistic lock
 * (§R4.2) surfaces as an honest conflict instead of a silent overwrite.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { mapPersona } from '@/entities/persona';
import { EditPersonaDialog } from '@/features/edit-persona';
import { PERSONAS, resetFixturePersonaState } from '@/shared/lib/fixtures/dataset';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

const SESSION: SessionDTO = {
  userId: 'usr_editor',
  email: 'editor@console.local',
  displayName: 'Console editor',
  role: 'editor',
  mfaEnabled: false,
};

const found = PERSONAS.find((p) => p.id === 'persona_tech');
if (!found) throw new Error('fixture must model persona_tech');
const WIRE = found;

function renderDialog(version: number | null = WIRE.version ?? null) {
  const persona = mapPersona({ ...WIRE, version });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={SESSION}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <EditPersonaDialog
                open
                onOpenChange={() => undefined}
                persona={persona}
                channelId="ch_tech"
              />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFixturePersonaState();
});

describe('EditPersonaDialog (FS8 T-FS8.6)', () => {
  it('seeds the voice fields and states the audit + read-only style truth', () => {
    renderDialog();
    expect(screen.getByLabelText('Name')).toHaveValue('The calm senior engineer');
    expect(screen.getByLabelText('Manner of speech')).toHaveValue(
      'Short declarative sentences. One number per claim.',
    );
    expect(screen.getByText(/Recorded in the audit log/)).toBeInTheDocument();
    expect(
      screen.getByText(/are derived by the backend .* and are not edited here/),
    ).toBeInTheDocument();
  });

  it('saves the voice through PATCH and confirms with the audited wording', async () => {
    renderDialog();
    const manner = screen.getByLabelText('Manner of speech');
    await userEvent.clear(manner);
    await userEvent.type(manner, 'Even shorter.');
    await userEvent.click(screen.getByRole('button', { name: 'Save voice' }));

    // Toast copy appears twice (toast + polite announcer) — the FS5 lesson.
    expect((await screen.findAllByText('Persona updated')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/recorded in the audit log and applies to future generations/i).length,
    ).toBeGreaterThan(0);
  });

  it('a STALE version surfaces the honest conflict, never a silent overwrite', async () => {
    renderDialog(1); // the fixture's current version is 3
    await userEvent.click(screen.getByRole('button', { name: 'Save voice' }));
    expect((await screen.findAllByText('This persona changed elsewhere')).length).toBeGreaterThan(
      0,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/nothing was overwritten/i);
  });

  it('archive requires an explicit confirm step', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Archive this persona…' }));
    expect(screen.getByText(/stays visible as history/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archive persona' }));
    expect((await screen.findAllByText('Persona archived')).length).toBeGreaterThan(0);
  });
});
