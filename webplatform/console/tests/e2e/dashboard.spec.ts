import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS5 dashboard journey (D3 §4 / STAGE_FS5_PLAN §2 T-FS5.10) on the
 * deterministic data fixtures: metrics render, gated data stays honest,
 * `j/k/↵` drives the queue into the Inspector, review intents queue (202),
 * channel switching re-scopes, roles reflect RBAC, the empty scenario shows
 * onboarding — plus axe on the first real screen.
 */
async function signIn(page: Page, role = 'owner'): Promise<void> {
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

const MOBILE_PROJECT = 'mobile';

test('dashboard renders deterministic metrics and the honest gated tile', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('heading', { level: 1, name: /Good day/ })).toBeVisible();

  // The four tile families, straight from the fixture dataset (ch_tech).
  await expect(page.getByText('Cost today')).toBeVisible();
  await expect(page.getByText('$4.82')).toBeVisible();
  await expect(page.getByText('Published today')).toBeVisible();
  await expect(page.getByText('Scheduled', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Needs Review', { exact: true }).first()).toBeVisible();

  // Engagement is GATED (§R10.3): the honest copy renders, zeros never do.
  const gated = page.getByTestId('gated-engagement');
  await expect(gated).toBeVisible();
  await expect(gated).toContainText('Engagement metrics need a stats adapter');
  await expect(page.getByText('Views today')).toHaveCount(0);

  // The AI summary is an honest seam until FS6 — labelled, nothing generated.
  await expect(
    page.getByRole('heading', { level: 2, name: '“What changed today?”' }),
  ).toBeVisible();

  // The schedule timeline shows the two queued publish slots.
  await expect(page.getByRole('heading', { level: 2, name: 'Upcoming schedule' })).toBeVisible();
});

test('j/k moves through the queue and ↵ opens the post Inspector', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);

  const row0 = page.locator('button[data-row-index="0"]');
  const row1 = page.locator('button[data-row-index="1"]');
  await row0.focus();

  await page.keyboard.press('j');
  await expect(row1).toBeFocused();
  await page.keyboard.press('k');
  await expect(row0).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/inspect=post(%3A|:)post_nr_1/);
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('Quantum-safe TLS moves to procurement')).toBeVisible();
  await expect(inspector.getByRole('heading', { name: 'History' })).toBeVisible();
  // History timeline renders the pipeline states from the fixture.
  await expect(inspector.getByText('Image phash near-duplicate')).toBeVisible();
});

test('approve fires a queue intent and the toast states the 202 truth', async ({ page }) => {
  await signIn(page);

  await page
    .getByRole('button', { name: /Approve/ })
    .first()
    .click();
  // The toast title AND the polite announcer both carry the copy — target the
  // toast card's exact title, then the description's first (visible) match.
  await expect(page.getByText('Approval queued', { exact: true })).toBeVisible();
  await expect(page.getByText(/The worker will process it/).first()).toBeVisible();
});

test('switching the channel re-scopes every dashboard section', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('$4.82')).toBeVisible();

  await page.getByRole('button', { name: 'Switch channel' }).click();
  await page.getByRole('menuitem', { name: 'Daily Brief' }).click();

  // Analytics, queue and schedule all re-scope to ch_daily.
  await expect(page.getByText('$2.11')).toBeVisible();
  await expect(page.getByText('Nothing needs review.', { exact: false })).toBeVisible();
  await expect(page.getByText('No upcoming slots.', { exact: false })).toBeVisible();
});

test('analyst and viewer read the same dashboard without review actions', async ({ page }) => {
  for (const role of ['analyst', 'viewer']) {
    await page.context().clearCookies();
    await signIn(page, role);
    await expect(page.getByText('$4.82')).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reject post' })).toHaveCount(0);
  }
});

test('the empty scenario renders the onboarding hero, not zeros', async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: 'onyx-fixture-scenario', value: 'empty', url: 'http://localhost:3000' }]);
  await signIn(page);

  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
  await expect(page.getByText('Cost today')).toHaveCount(0);
});

test('the real dashboard is accessible (axe)', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('$4.82')).toBeVisible();
  // Park the pointer so no control is scanned in its hover state.
  await page.mouse.move(0, 0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});
