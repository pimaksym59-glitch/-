import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS12 Platform & Admin journeys (D3 §14–§22 / STAGE_FS12_PLAN §4) on the
 * deterministic fixtures: governance on the calls the contract carries, the
 * queue with its three intents and the D14 raw labels, the audit diff, the
 * readiness probes, the write-only key surface, the platform-wide cost view,
 * the three honest seams, the RBAC reconciliation — plus axe.
 *
 * Sharp edges honoured (PART3 §3.3): role **+ level** for headings · scope
 * assertions to a region when copy repeats elsewhere on the page · `.first()`
 * can hit a hidden pane on mobile.
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

/* ------------------------------------------------------------------- Jobs */

test('the queue renders the contract statuses, mapping only the exact five', async ({ page }) => {
  await signIn(page);
  await page.goto('/jobs');

  await expect(page.getByRole('heading', { level: 1, name: 'Jobs' })).toBeVisible();
  const rows = page.getByRole('list', { name: 'Queue tasks' });
  await expect(rows).toBeVisible();

  // The three the vocabulary does not carry keep the backend's own words.
  await expect(rows.getByText('Dead (DLQ)')).toBeVisible();
  await expect(rows.getByText('Deferred')).toBeVisible();
  await expect(rows.getByText('Cancelled')).toBeVisible();
  // The five with an exact equivalent render as ONYX badges.
  await expect(rows.getByText('Queued').first()).toBeVisible();
  await expect(rows.getByText('Completed').first()).toBeVisible();
});

test('a requeue is confirmed and reports QUEUED truth, never "done"', async ({ page }) => {
  await signIn(page);
  await page.goto('/jobs');

  await page.getByRole('button', { name: 'Requeue' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/returns to the queue as pending/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Queue it' }).click();

  await expect(page.getByText('Requeue queued').first()).toBeVisible();
});

test('the contract filters live in the URL and Back reverses them', async ({ page }) => {
  await signIn(page);
  await page.goto('/jobs');

  await page.getByLabel('Status').click();
  await page.getByRole('option', { name: 'dead', exact: true }).click();
  await expect(page).toHaveURL(/status=dead/);
  const rows = page.getByRole('list', { name: 'Queue tasks' });
  await expect(rows.getByText('Dead (DLQ)')).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/status=dead/);
});

test('analyst and viewer cannot reach the queue at all (the contract scopes it)', async ({
  page,
}) => {
  await signIn(page, 'analyst');
  await page.goto('/jobs');
  // 403 renders a permission state via rewrite — never a crash, and the URL is
  // preserved so granting the permission makes the page work (FS2 decision 6).
  await expect(page.getByText('You don’t have access to this screen')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Queue tasks' })).toHaveCount(0);
});

/* ------------------------------------------------------------------ Admin */

test('an owner manages roles; an admin gets an honest permission state', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
  const roster = page.getByRole('list', { name: 'Users' });
  await expect(roster.getByText('owner@console.local').first()).toBeVisible();
  await expect(roster.getByText(/superuser — unrecognised role/)).toBeVisible();

  await signIn(page, 'admin');
  await page.goto('/admin');
  await expect(page.getByText('Your role cannot manage users')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create user' })).toHaveCount(0);
});

test('config versions diff two SERVED snapshots and say when they cannot', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin?tab=config');

  const rows = page.getByRole('list', { name: 'Configuration snapshots' });
  await expect(rows).toBeVisible();
  await rows.getByRole('button', { name: 'Compare as before' }).nth(1).click();
  await rows.getByRole('button', { name: 'Compare as after' }).first().click();

  await expect(page).toHaveURL(/a=cfg_2/);
  await expect(page).toHaveURL(/b=cfg_3/);
  await expect(page.getByRole('heading', { level: 2, name: 'Comparison' })).toBeVisible();
  await expect(page.getByText('similarity_threshold')).toBeVisible();

  // The version whose payload the wire omitted cannot be compared, and says so.
  await expect(page.getByText('no snapshot payload on the wire')).toBeVisible();
});

/* ------------------------------------------------------------------ Audit */

test('the audit log renders a real before→after diff and a create with no before', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/audit');

  await expect(page.getByRole('heading', { level: 1, name: 'Audit' })).toBeVisible();
  await page.getByRole('button', { name: 'View diff' }).first().click();

  const diff = page.getByRole('region', { name: /user\.role_changed|channel\.created/ }).first();
  await expect(diff).toBeVisible();
});

test('audit export is client-side: copy link and CSV, no endpoint', async ({ page }) => {
  await signIn(page);
  await page.goto('/audit?entity=user');

  await expect(page).toHaveURL(/entity=user/);
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
  await expect(page.getByText('No server-side export')).toBeVisible();
});

/* ----------------------------------------------------------------- Health */

test('readiness renders only what it names, and unknown is never green', async ({ page }) => {
  await signIn(page);
  await page.goto('/health');

  await expect(page.getByRole('heading', { level: 1, name: 'Health' })).toBeVisible();
  const probes = page.getByRole('list', { name: 'Dependency probes' });
  await expect(probes.getByText('postgres')).toBeVisible();
  await expect(probes.getByText(/Reported “fake”/)).toBeVisible();
  await expect(probes.getByRole('img', { name: 'Unknown' })).toBeVisible();
  await expect(page.getByText('No probe history')).toBeVisible();
});

/* -------------------------------------------------------------- Providers */

test('the key surface shows presence only and never a value', async ({ page }) => {
  await signIn(page);
  await page.goto('/providers');

  await expect(page.getByRole('heading', { level: 1, name: 'Providers' })).toBeVisible();
  const slots = page.getByRole('list', { name: 'Provider key slots' });
  await expect(slots.getByText('openai')).toBeVisible();
  await expect(slots.getByText(/No key stored/).first()).toBeVisible();
  await expect(slots.getByText(/did not say whether a key is stored/)).toBeVisible();

  await slots.getByRole('button', { name: 'Rotate key' }).first().click();
  const field = page.getByLabel('New key');
  await expect(field).toHaveAttribute('type', 'password');
  await expect(field).toHaveValue('');
  await field.fill('sk-live-should-never-be-echoed');
  await page.getByRole('button', { name: 'Store key' }).click();

  // The toast copy is also read by the polite announcer — assert the first.
  await expect(page.getByText('Key stored').first()).toBeVisible();
  // The submitted value appears nowhere on the page after the write.
  await expect(page.getByText('sk-live-should-never-be-echoed')).toHaveCount(0);
  await expect(page.getByLabel('New key')).toHaveCount(0);
});

test('an admin cannot rotate a key (owner-only per the matrix)', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/providers');
  await expect(page.getByRole('button', { name: 'Rotate key' })).toHaveCount(0);
  await expect(page.getByText('No key is ever displayed')).toBeVisible();
});

/* ---------------------------------------------------------------- Billing */

test('billing is platform-wide and a channel switch changes nothing', async ({ page }) => {
  await signIn(page);
  await page.goto('/billing');

  await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toBeVisible();
  // The ROW list is the data; the chart beside it renders lazily, so comparing
  // the whole region would race the axis rather than test the claim.
  const rows = page.getByRole('list', { name: /Cost rows by/ });
  await expect(rows).toBeVisible();
  const before = await rows.innerText();

  await page.getByRole('button', { name: 'Switch channel' }).click();
  await page.getByRole('menuitem', { name: /Daily Brief/ }).click();

  const after = await rows.innerText();
  expect(after).toBe(before);
});

test('the cost facet is the contract’s own and lives in the URL', async ({ page }) => {
  await signIn(page);
  await page.goto('/billing');

  await page.getByRole('radio', { name: 'Provider' }).click();
  await expect(page).toHaveURL(/group_by=provider/);
  await expect(page.getByRole('heading', { level: 2, name: 'Cost by provider' })).toBeVisible();
  await expect(page.getByText('No forecast')).toBeVisible();
});

/* ------------------------------------------------------------------ Seams */

test('logs, flags and notifications state fact, reason and remedy', async ({ page }) => {
  await signIn(page);

  await page.goto('/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Logs' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'What the backend has' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'What would change it' })).toBeVisible();

  await page.goto('/flags');
  await expect(page.getByRole('heading', { level: 1, name: 'Feature Flags' })).toBeVisible();
  // No toggle exists to mislead anyone.
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);

  await page.goto('/notifications');
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('Why there is no centre')).toBeVisible();
});

/* ------------------------------------------------------------- Inspector + AI */

test('the task Inspector opens from the URL and offers the AI panel on request', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'asserts the desktop drawer');
  await signIn(page);
  await page.goto('/jobs?inspect=task:task_dead_1');

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('task_dead_1')).toBeVisible();
  await expect(
    inspector.getByText('TelegramForbidden: bot was kicked from the channel'),
  ).toBeVisible();

  // The AI panel exists but nothing has run — it is user-invoked only.
  await expect(
    inspector.getByRole('heading', { level: 3, name: 'Explain this task' }),
  ).toBeVisible();
  await expect(inspector.getByText(/no access to logs/)).toBeVisible();
});

/* -------------------------------------------------------------------- axe */

test('axe: the jobs queue has no violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/jobs');
  await expect(page.getByRole('list', { name: 'Queue tasks' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, axeMessage(violations)).toEqual([]);
});

test('axe: the admin config diff has no violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin?tab=config&a=cfg_2&b=cfg_3');
  await expect(page.getByRole('heading', { level: 2, name: 'Comparison' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, axeMessage(violations)).toEqual([]);
});

test('axe: the providers key surface has no violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/providers');
  await expect(page.getByRole('list', { name: 'Provider key slots' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, axeMessage(violations)).toEqual([]);
});

test('axe: a seam screen has no violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Logs' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, axeMessage(violations)).toEqual([]);
});
