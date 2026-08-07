import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS13 Account journeys (D3 §23 Settings · §24 User Profile · §22 preferences)
 * on the deterministic fixtures.
 *
 * The two that matter most for this stage are the ones only a real browser can
 * prove:
 *   - **theme survives a reload with no FOUC** — the entry duty. The assertion
 *     is on the INITIAL HTML DOCUMENT, before any client JS runs, because that
 *     is what "applied SSR from the cookie" actually means.
 *   - **a muted toast never appears** — D5-B is only real if the emitter
 *     honours it, and `danger` must stay unmutable.
 *
 * Sharp edges honoured (PART3 §3.3): role **+ level** for headings · scope
 * assertions to a region when copy repeats · `.first()` can hit a hidden pane
 * on mobile.
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

/* --------------------------------------------------------------- appearance */

test('theme and density are applied by the SERVER on the next load — no FOUC', async ({
  page,
  request,
}) => {
  await signIn(page);
  await page.goto('/settings');

  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('radio', { name: 'Compact' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

  // The real proof: fetch the RAW document with the cookies the browser now
  // holds and assert the attributes are already in the markup. If theme were
  // applied by client JS, this HTML would carry the defaults and the user would
  // see a flash on every navigation.
  const cookies = await page.context().cookies();
  const header = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const raw = await request.get('/settings', { headers: { cookie: header } });
  const html = await raw.text();
  expect(html).toContain('data-theme="light"');
  expect(html).toContain('data-density="compact"');

  // And it survives a reload in the browser.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('a settings section is a place: deep-linkable and reversible by Back', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/security');
  await expect(page.getByRole('heading', { level: 2, name: 'Security' })).toBeVisible();

  await page.getByRole('link', { name: 'Experience' }).click();
  await expect(page).toHaveURL(/\/settings\/experience$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Experience' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Security' })).toBeVisible();
});

test('an unknown settings section resolves to Appearance instead of a 404', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/telepathy');
  await expect(page.getByRole('heading', { level: 2, name: 'Appearance' })).toBeVisible();
});

/* --------------------------------------------------------------- experience */

test('experience level persists across a reload and changes what is revealed', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/experience');

  await expect(page.getByText(/Advanced detail stays hidden/i)).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await expect(page.getByText(/Storage keys, cookie names/i)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Advanced' })).toBeChecked();

  // The level is CONSUMED, not merely stored: Appearance now names its cookies.
  await page.goto('/settings');
  await expect(page.getByText(/onyx-theme, onyx-density/)).toBeVisible();
});

/* ------------------------------------------------------ notification muting */

test('a muted toast kind never appears, and errors can never be muted', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/notifications');

  // Errors have no control at all — the control's absence IS the guarantee.
  await expect(page.getByText('Always shown')).toBeVisible();
  await expect(page.getByRole('switch', { name: /error/i })).toHaveCount(0);

  await page.getByRole('switch', { name: /information toasts/i }).click();
  await expect(page.getByRole('switch', { name: /information toasts/i })).not.toBeChecked();

  // Now exercise a REAL emitter: the Needs-Review queue raises an `info` toast
  // ("Approval queued") on its 202 intent. With the kind muted, that copy must
  // appear nowhere — a muted kind is neither shown NOR announced, so asserting
  // on the text also covers the live region. (`role="status"` cannot be used:
  // the announcer's persistent region always matches it — the FS5 pitfall.)
  await page.goto('/dashboard');
  const queue = page.getByRole('list', { name: 'Needs review' });
  await queue.getByRole('button', { name: 'Approve' }).first().click();
  await expect(page.getByText('Approval queued')).toHaveCount(0);

  // Un-mute and prove the SAME action does surface — otherwise the assertion
  // above would pass for the wrong reason.
  await page.goto('/settings/notifications');
  await page.getByRole('switch', { name: /information toasts/i }).click();
  await expect(page.getByRole('switch', { name: /information toasts/i })).toBeChecked();
  await page.goto('/dashboard');
  await page
    .getByRole('list', { name: 'Needs review' })
    .getByRole('button', { name: 'Approve' })
    .first()
    .click();
  await expect(page.getByText('Approval queued').first()).toBeVisible();
});

/* ------------------------------------------------------------------ profile */

test('the profile shows identity and states why sessions cannot be listed', async ({ page }) => {
  await signIn(page);
  await page.goto('/profile');

  await expect(page.getByRole('heading', { level: 1, name: /Console Owner/i })).toBeVisible();
  await expect(page.getByText('owner@console.local').first()).toBeVisible();
  // No edit affordance anywhere: the contract has no self-service write.
  await expect(page.getByRole('button', { name: /edit profile/i })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Sessions' }).click();
  await expect(page).toHaveURL(/tab=sessions/);
  await expect(page.getByText(/Your sessions cannot be listed/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Open Admin → Sessions/i })).toBeVisible();
});

test('activity shows only my own records, and opens the audit Inspector', async ({ page }) => {
  await signIn(page);
  await page.goto('/profile?tab=activity');

  const list = page.getByRole('list', { name: 'Your recent activity' });
  await expect(list).toBeVisible();
  await expect(list.getByText('prompt.version_created')).toBeVisible();
  await expect(list.getByText('channel.paused')).toBeVisible();
  // Records belonging to other actors must not leak into a personal feed.
  await expect(list.getByText('document.deleted')).toHaveCount(0);
  await expect(list.getByText('api_key.rotated')).toHaveCount(0);

  await list.getByRole('button', { name: 'channel.paused' }).click();
  await expect(page).toHaveURL(/inspect=audit%3Aaud_self_2|inspect=audit:aud_self_2/);
});

test('a role the matrix excludes meets a permission state inside the screen', async ({ page }) => {
  await signIn(page, 'editor');
  await page.goto('/profile?tab=activity');
  await expect(page.getByText(/Your role cannot read the activity record/i)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your recent activity' })).toHaveCount(0);
});

test('an analyst reads their activity but is not offered the AI summary', async ({ page }) => {
  await signIn(page, 'analyst');
  await page.goto('/profile?tab=activity');
  await expect(page.getByRole('list', { name: 'Your recent activity' })).toBeVisible();
  await expect(page.getByRole('button', { name: /summarize with ai/i })).toHaveCount(0);
});

test('the AI summary never runs on its own', async ({ page }) => {
  await signIn(page);
  await page.goto('/profile?tab=activity');
  await page.getByRole('button', { name: /summarize with ai/i }).click();

  const panel = page.getByRole('region', { name: /summarize your activity/i });
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('explain-activity-output')).toHaveCount(0);

  await panel.getByRole('button', { name: 'Summarize activity' }).click();
  await expect(page.getByTestId('explain-activity-output')).toBeVisible();
  // The answer carries provenance and no invented confidence.
  await expect(panel.getByText(/Generated/i).first()).toBeVisible();
});

/* ---------------------------------------------------------------- shortcuts */

test('⌘, opens Settings from anywhere', async ({ page }) => {
  await signIn(page);
  await page.goto('/dashboard');
  await page.keyboard.press('ControlOrMeta+,');
  await expect(page).toHaveURL(/\/settings$/);
});

/* --------------------------------------------------------------------- axe */

test('Settings has no accessibility violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings');
  const settings = await new AxeBuilder({ page }).analyze();
  expect(settings.violations, axeMessage(settings.violations)).toEqual([]);

  await page.goto('/settings/notifications');
  const notifications = await new AxeBuilder({ page }).analyze();
  expect(notifications.violations, axeMessage(notifications.violations)).toEqual([]);
});

test('Profile has no accessibility violations, including the activity tab', async ({ page }) => {
  await signIn(page);
  await page.goto('/profile');
  const overview = await new AxeBuilder({ page }).analyze();
  expect(overview.violations, axeMessage(overview.violations)).toEqual([]);

  await page.goto('/profile?tab=sessions');
  const sessions = await new AxeBuilder({ page }).analyze();
  expect(sessions.violations, axeMessage(sessions.violations)).toEqual([]);

  await page.goto('/profile?tab=activity');
  await expect(page.getByRole('list', { name: 'Your recent activity' })).toBeVisible();
  const activity = await new AxeBuilder({ page }).analyze();
  expect(activity.violations, axeMessage(activity.violations)).toEqual([]);
});
