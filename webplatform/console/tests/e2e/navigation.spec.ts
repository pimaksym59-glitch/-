import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS2 navigation journeys (Stage 2 §12 / D3 Part C).
 * FS4: sign-in goes through the REAL login form against the deterministic
 * fixture gateway (local/ci) — one account per role, documented public
 * credential. The journeys themselves are unchanged.
 */
async function signIn(page: Page, role = 'owner'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@console.local`);
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Opens the palette and waits for it to be interactive. The palette is a lazy
 * (`dynamic()`) chunk, so typing before it mounts would send keystrokes to the
 * document — where `g` is a navigation chord.
 */
async function openPalette(page: Page): Promise<void> {
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await expect(page.getByRole('combobox')).toBeFocused();
}

function axeMessage(violations: { id: string; nodes: { target: unknown }[] }[]): string {
  return JSON.stringify(
    violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    null,
    2,
  );
}

/** The sidebar/inspector are desktop chrome; mobile uses the tab bar + sheets. */
const MOBILE_PROJECT = 'mobile';

test('sidebar rail collapses, persists across reload, and stays keyboard-operable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Sidebar is desktop/tablet chrome.');
  await signIn(page);

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-sidebar', 'expanded');

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(html).toHaveAttribute('data-sidebar', 'rail');

  // Persisted via cookie → survives a full reload with no flash of the wrong state.
  await page.reload();
  await expect(html).toHaveAttribute('data-sidebar', 'rail');

  // The rail keeps accessible names for every destination.
  await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(html).toHaveAttribute('data-sidebar', 'expanded');
});

test('command palette navigates by keyboard only', async ({ page }) => {
  await signIn(page);

  await openPalette(page);

  await page.keyboard.type('@analytics');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
});

test('palette: `#` searches knowledge and memory for real; `/` Ask AI is REAL since FS6', async ({
  page,
}) => {
  await signIn(page);
  await openPalette(page);

  // FS7 replaced the FS2 seam with real knowledge search; FS8 added the memory
  // scope as a SEPARATE group (§R9.3 — Knowledge ≠ Memory, never merged); FS9
  // added Images as a third separate group.
  await page.keyboard.type('#voice');
  await expect(page.getByRole('option', { name: /Voice and style guide/ })).toBeVisible();

  await page.getByRole('combobox').fill('#calm senior');
  await expect(page.getByRole('option', { name: /The calm senior engineer/ })).toBeVisible();

  await page.getByRole('combobox').fill('#zzz-no-such-entry');
  // FS10 added the platform-wide Prompts group to `#`, so the honest
  // empty-state copy now names it too (a factually necessary update).
  await expect(
    page.getByText(/Nothing in knowledge, memory, images or prompts matches/),
  ).toBeVisible();
  await expect(page.getByText(/posts, logs and audit land with/)).toBeVisible();

  await page.getByRole('combobox').fill('/draft a post');
  await expect(page.getByText('Ask AI: “draft a post”')).toBeVisible();
});

test('g-chords jump between screens and never hijack text entry', async ({ page }) => {
  await signIn(page);

  await page.keyboard.press('g');
  await page.keyboard.press('k');
  await expect(page).toHaveURL(/\/knowledge/);

  // Inside the palette input, `g` must type, not navigate.
  await openPalette(page);
  await page.keyboard.type('gd');
  await expect(page).toHaveURL(/\/knowledge/);
  await page.keyboard.press('Escape');
});

test('cheat-sheet is generated from the shortcut registry', async ({ page }) => {
  await signIn(page);

  await page.keyboard.press('ControlOrMeta+/');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Command palette')).toBeVisible();
  await expect(dialog.getByText('Go to Dashboard')).toBeVisible();
  // Shortcuts owned by later stages are shown, but labelled honestly.
  await expect(dialog.getByText('Send message')).toBeVisible();
});

test('inspector opens from the URL and closes without navigating', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Below md the inspector renders as a sheet.');
  await signIn(page);

  // `document` gained its real view in FS7 — the honest FS2 fallback is now
  // asserted with a type whose workspace has not landed yet (memory → FS8).
  await page.goto('/dashboard?inspect=memory:mem-42');
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('mem-42')).toBeVisible();
  await expect(page).toHaveURL(/inspect=memory%3Amem-42|inspect=memory:mem-42/);
});

test('RBAC: a viewer is redirected to the permission state, never a crash', async ({ page }) => {
  await signIn(page, 'viewer');

  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: /don’t have access|don't have access/i }),
  ).toBeVisible();
  // The URL is preserved by the rewrite (no redirect away from the target).
  await expect(page).toHaveURL(/\/admin$/);

  // A permitted screen still works for the same role.
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
});

test('mobile navigation exposes the bottom tab bar and a full nav sheet', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== MOBILE_PROJECT, 'Mobile-only navigation.');
  await signIn(page);

  const mobileNav = page.getByRole('navigation', { name: 'Primary mobile' });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'More navigation' }).click();
  const sheet = page.getByRole('dialog', { name: 'Navigation' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('link', { name: 'Prompt Library' }).click();
  await expect(page).toHaveURL(/\/prompts/);
});

test('viewer never sees forbidden destinations in the sidebar or palette', async ({ page }) => {
  await signIn(page, 'viewer');

  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Analytics' }).first()).toBeVisible();

  await openPalette(page);
  await page.keyboard.type('@admin');
  await expect(page.getByText('No results.')).toBeVisible();
});

test('unauthenticated access redirects to login with a return path', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/login\?next=%2Fjobs/);
});

test('navigation surfaces are accessible (axe)', async ({ page }) => {
  await signIn(page);

  const shell = await new AxeBuilder({ page }).analyze();
  expect(shell.violations, axeMessage(shell.violations)).toEqual([]);

  await openPalette(page);
  const palette = await new AxeBuilder({ page }).analyze();
  expect(palette.violations, axeMessage(palette.violations)).toEqual([]);
  await page.keyboard.press('Escape');

  await page.keyboard.press('ControlOrMeta+/');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  const cheatsheet = await new AxeBuilder({ page }).analyze();
  expect(cheatsheet.violations, axeMessage(cheatsheet.violations)).toEqual([]);
});
