import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Smoke journey (Stage 2 §12): the shell renders, middleware guards a
 * protected route, REAL form sign-in (FS4, fixture gateway in local/ci)
 * reaches it, theme toggles, and a route stub loads — with an axe a11y
 * assertion on the shell.
 */
function axeMessage(violations: { id: string; nodes: { target: unknown }[] }[]): string {
  return JSON.stringify(
    violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    null,
    2,
  );
}

test('landing renders and is accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Console' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});

test('protected route redirects, real sign-in reaches the shell, theme toggles', async ({
  page,
}) => {
  // Middleware protection: /dashboard → /login?next=/dashboard
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  // Real form sign-in restores the deep-linked destination (next=).
  await page.getByLabel('Email').fill('owner@console.local');
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // FS5: the dashboard stub became the real screen — the h1 is the greeting.
  await expect(page.getByRole('heading', { level: 1, name: /Good day/ })).toBeVisible();

  // Theme toggle flips the data-theme attribute (SSR-consistent, no crash).
  // FS2 moved the toggle into the avatar menu and the ⌘⇧L shortcut.
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await expect(html).not.toHaveAttribute('data-theme', before ?? 'dark');

  // A route stub loads via direct nav.
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});

test('sign-out ends the session and returns to login (FS4)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@console.local');
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  // The session is really gone — a protected route redirects again.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('wrong credentials stay on login with a safe error (FS4)', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@console.local');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Next's route announcer is also role=alert — target the form error text.
  await expect(page.getByText('Invalid email or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('register is the honest by-invitation state (no contract endpoint)', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Access is by invitation' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to sign in' }).click();
  await expect(page).toHaveURL(/\/login/);
  // FS14: a URL change is not a render. Client-side navigation resolves the
  // URL first and paints after, so scanning here caught the login page with
  // zero landmarks and no h1 — a latent race in this FS4-era assertion, not a
  // broken page (measured: 0 of h1/main/form immediately, all three ~1.5s
  // later; three control builds excluded every FS14 file with global reach).
  // Waiting for a real element makes the scan deterministic and STRONGER: axe
  // now always sees the fully rendered form rather than whatever had painted.
  await expect(page.getByLabel('Email')).toBeVisible();
  // Park the pointer so no control is axe-scanned in its hover state.
  await page.mouse.move(0, 0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});
