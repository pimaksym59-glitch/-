/**
 * VersionComposer (FS10 T-FS10.6/T-FS10.11). The Prompt Library's only write:
 * an edit IS a new version (§R10.6). The tests encode the boundaries as much as
 * the behaviour — no promote-on-save, no overwrite, no variable helpers — plus
 * the D4 §7 draft contract (unsaved work survives, a successful save clears it).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupPromptsByType, mapPrompt, type PromptGroupVM } from '@/entities/prompt';
import { clearPromptDraft, readPromptDraft, VersionComposer } from '@/features/manage-prompt';
import type { Role } from '@/shared/config/rbac';
import { PROMPTS, resetFixturePromptState } from '@/shared/lib/fixtures/dataset';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

const GROUPS = groupPromptsByType(PROMPTS.map(mapPrompt));

function systemGroup(): PromptGroupVM {
  const group = GROUPS.find((entry) => entry.type === 'system');
  if (!group) throw new Error('the prompt fixtures must contain the system chain');
  return group;
}

const SYSTEM = systemGroup();

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderComposer(onCreated = vi.fn(), onOpenChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor('editor')}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <VersionComposer
                open
                onOpenChange={onOpenChange}
                groups={GROUPS}
                presetType="system"
                presetFrom={SYSTEM.latest}
                onCreated={onCreated}
              />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, onCreated, onOpenChange };
}

beforeEach(() => {
  resetFixturePromptState();
  clearPromptDraft('system');
  clearPromptDraft('image');
});

describe('VersionComposer (FS10 T-FS10.6)', () => {
  it('prefills from the version being viewed and says an edit is a new version', () => {
    renderComposer();
    expect(screen.getByRole('heading', { name: 'New prompt version' })).toBeInTheDocument();
    expect(
      screen.getByText(/Saving creates a new version. The previous one stays in the history/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Version text')).toHaveValue(SYSTEM.latest.text);
  });

  it('offers no promote, no delete and no variable helper', () => {
    renderComposer();
    expect(screen.queryByRole('button', { name: /promote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /insert variable/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/variables?/i)).not.toBeInTheDocument();
  });

  it('saves a new version and reports the version the SERVER assigned', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderComposer();

    const textarea = screen.getByLabelText('Version text');
    await user.clear(textarea);
    await user.type(textarea, 'a fourth revision');
    await user.click(screen.getByRole('button', { name: 'Save as new version' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const created = onCreated.mock.calls[0]?.[0] as { version: number; type: string };
    expect(created.version).toBe(4);
    expect(created.type).toBe('system');
    // 201 truth in the toast — never 202 "queued" wording.
    expect(await screen.findByText('Saved as v4')).toBeInTheDocument();
    expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
  });

  it('refuses to save empty text instead of writing a blank version', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderComposer();
    await user.clear(screen.getByLabelText('Version text'));
    await user.click(screen.getByRole('button', { name: 'Save as new version' }));
    expect(await screen.findByText('A version needs text.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('persists unsaved work as a draft and clears it on a successful save', async () => {
    const user = userEvent.setup();
    const { unmount } = renderComposer();

    const textarea = screen.getByLabelText('Version text');
    await user.clear(textarea);
    await user.type(textarea, 'work in progress');
    expect(readPromptDraft('system')?.text).toBe('work in progress');

    // Re-mounting restores it (D4 §7 "restored on return").
    unmount();
    renderComposer();
    expect(screen.getByLabelText('Version text')).toHaveValue('work in progress');
    expect(
      screen.getByText('Restored from your unsaved draft on this device.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save as new version' }));
    await waitFor(() => expect(readPromptDraft('system')).toBeNull());
  });

  it('discarding a draft returns to the version being edited', async () => {
    const user = userEvent.setup();
    renderComposer();
    const textarea = screen.getByLabelText('Version text');
    await user.clear(textarea);
    await user.type(textarea, 'scratch');
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.getByLabelText('Version text')).toHaveValue(SYSTEM.latest.text);
    expect(readPromptDraft('system')).toBeNull();
  });
});
