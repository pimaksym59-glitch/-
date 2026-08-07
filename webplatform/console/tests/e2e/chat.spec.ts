import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS6 chat journeys (D3 §5/§6 / STAGE_FS6_PLAN §2 T-FS6.10) on the
 * deterministic AI fixture: streamed turns, Stop preserving partial output,
 * local persistence across reload, conversation navigation, the chat→pipeline
 * bridge, the palette `/` hand-off, the user-invoked dashboard summary, and
 * RBAC honesty — plus axe on the real chat.
 */
async function signIn(page: Page, role = 'editor'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@console.local`);
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function axeMessage(violations: { id: string; nodes: { target: unknown }[] }[]): string {
  return JSON.stringify(
    violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    null,
    2,
  );
}

async function sendPrompt(page: Page, prompt: string): Promise<void> {
  await page.getByRole('textbox', { name: /Ask your AI/ }).fill(prompt);
  await page.getByRole('button', { name: /Send/ }).click();
}

test('a chat turn streams to completion with wire cost and model', async ({ page }) => {
  await signIn(page);
  await page.goto('/chat');
  await expect(page.getByText('Start a conversation')).toBeVisible();

  await sendPrompt(page, 'Draft a post about the release');
  await expect(page).toHaveURL(/\/chat\/conv_/);

  // Deterministic fixture output, streamed then persisted.
  await expect(page.getByText(/Deterministic fixture reply/).first()).toBeVisible();
  await expect(page.getByText('You asked: Draft a post about the release')).toBeVisible();
  await expect(page.getByText('$0.0042')).toBeVisible();
  await expect(page.getByText('claude-opus-4-8')).toBeVisible();
});

test('Stop cancels the stream and PRESERVES the partial output honestly', async ({ page }) => {
  await signIn(page);
  await page.goto('/chat');
  await sendPrompt(page, 'A long answer please');

  // Wait for the first streamed words, then stop mid-stream.
  await expect(page.getByText(/Deterministic fixture/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Stop generating' }).click();

  await expect(page.getByText('Stopped', { exact: true })).toBeVisible();
  await expect(page.getByText(/partial output, kept as-is/)).toBeVisible();
  // The full fixture tail never arrived.
  await expect(page.getByText(/You asked: A long answer please/)).toHaveCount(0);
});

test('conversations persist locally across reload and navigate with [ and ]', async ({
  page,
}, testInfo) => {
  await signIn(page);
  await page.goto('/chat');
  await sendPrompt(page, 'First conversation');
  await expect(page.getByText('You asked: First conversation')).toBeVisible();

  // Second conversation via ⌘⇧O.
  await page.keyboard.press('ControlOrMeta+Shift+o');
  await expect(page).toHaveURL(/\/chat$/);
  await sendPrompt(page, 'Second conversation');
  await expect(page.getByText('You asked: Second conversation')).toBeVisible();

  // Reload: local-first threads survive; the rail lists both (the rail is
  // desktop chrome — on mobile it lives in a closed sheet).
  await page.reload();
  await expect(page.getByText('You asked: Second conversation')).toBeVisible();
  if (testInfo.project.name !== 'mobile') {
    const rail = page.getByRole('list', { name: 'Conversations' });
    await expect(rail.getByText('First conversation')).toBeVisible();
  }

  // `[` walks to the other conversation (pinned-first, most-recent order).
  await page.keyboard.press('BracketRight');
  await expect(page.getByText('You asked: First conversation')).toBeVisible();
});

test('Insert to channel creates a real 201 draft; generation is a queued 202 truth', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/chat');
  await sendPrompt(page, 'Turn this into a draft');
  await expect(page.getByText('You asked: Turn this into a draft')).toBeVisible();
  // Wait for the DONE marker (wire cost) — actions exist only on the
  // persisted turn, not on the transient streaming bubble.
  await expect(page.getByText('$0.0042')).toBeVisible();

  // Scope to the thread ("Conversation", EXACT — substring labelling also
  // matches the rail's "Conversation actions"/"Conversations" chrome).
  const bubble = page
    .getByLabel('Conversation', { exact: true })
    .locator('.group', { hasText: 'Deterministic fixture reply' })
    .first();
  await bubble.hover();
  await bubble.getByRole('button', { name: 'Insert to channel' }).click();

  const dialog = page.getByRole('dialog', { name: 'Insert to channel' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Create draft' }).click();

  await expect(page.getByText('Draft created', { exact: true })).toBeVisible();
  await expect(page.getByText(/generation queued \(task task_intent_/).first()).toBeVisible();
});

test('palette `/` hands the query to a new chat and sends it', async ({ page }) => {
  await signIn(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.getByRole('combobox').fill('/draft a post about pricing');
  await page.getByText('Ask AI: “draft a post about pricing”').click();

  await expect(page).toHaveURL(/\/chat/);
  await expect(page.getByText('You asked: draft a post about pricing')).toBeVisible();
});

test('dashboard summary runs ONLY on explicit action, with Trust + Explainability + cost', async ({
  page,
}) => {
  await signIn(page, 'owner');

  // Nothing auto-runs on the dashboard (owner condition 4).
  await expect(page.getByText(/only when you ask, never automatically/)).toBeVisible();
  await expect(page.getByTestId('dashboard-summary-output')).toHaveCount(0);

  await page.getByRole('button', { name: /Generate summary/ }).click();
  const output = page.getByTestId('dashboard-summary-output');
  await expect(output.getByText(/Deterministic fixture reply/)).toBeVisible();
  await expect(output.getByText('Generated', { exact: true })).toBeVisible();
  await expect(output.getByText('$0.0042')).toBeVisible();

  await output.getByRole('button', { name: /Why this output/ }).click();
  await expect(output.getByText(/views, reactions/)).toBeVisible();
});

test('analyst and viewer: chat is a 403 permission state; Ask AI is not offered', async ({
  page,
}) => {
  for (const role of ['analyst', 'viewer']) {
    await page.context().clearCookies();
    await signIn(page, role);

    await page.goto('/chat');
    await expect(
      page.getByRole('heading', { name: /don’t have access|don't have access/i }),
    ).toBeVisible();

    await page.goto('/dashboard');
    // ⌘K races client hydration right after goto — retry until the shortcut
    // listener is attached.
    await expect(async () => {
      await page.keyboard.press('ControlOrMeta+k');
      await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible({
        timeout: 1000,
      });
    }).toPass();
    await page.getByRole('combobox').fill('/anything');
    await expect(page.getByText(/Ask AI is an editor action/)).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('the real chat screen is accessible (axe)', async ({ page }) => {
  await signIn(page);
  await page.goto('/chat');
  await sendPrompt(page, 'Accessibility pass');
  await expect(page.getByText('You asked: Accessibility pass')).toBeVisible();
  await page.mouse.move(0, 0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});
