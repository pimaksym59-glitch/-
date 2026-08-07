import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS10 Prompt Library journeys (D3 §10 / STAGE_FS10_PLAN §4 T-FS10.12) on the
 * deterministic fixtures: the library grouped by prompt TYPE with real version
 * counts, the version deep link, a REAL client-side diff, the contract's only
 * write (a new version), the unsaved-draft contract, the platform-wide truth
 * (a channel switch changes nothing), the honest absences (no activation, no
 * variables, no delete), the palette `#` Prompts group kept separate from
 * Knowledge/Memory/Images, read-only roles, URL reversibility — plus axe.
 *
 * Sharp edges honoured (PART3 §3.3): role **+ level** for headings · `{ exact:
 * true }` for substring-prone labels · anchor post-stream assertions on the
 * wire-cost done marker · scope `.first()` to a visible region on mobile.
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

test('the library lists prompt TYPES with their real version counts', async ({ page }) => {
  await signIn(page);
  await page.goto('/prompts');

  await expect(page.getByRole('heading', { level: 1, name: 'Prompt Library' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Prompt types' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open prompt System' })).toBeVisible();
  await expect(page.getByText('3 versions')).toBeVisible();

  // An unrecognised wire type survives by its raw value.
  await expect(page.getByText(/unrecognised type “weekly_digest”/)).toBeVisible();

  // Nothing the contract cannot back is rendered.
  await expect(page.getByText('Active', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Draft', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Promote to active/ })).toHaveCount(0);
  await expect(page.getByText(/\d+ variables?/)).toHaveCount(0);
});

test('the version deep link shows the stored text, the chain and the author id', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/prompts/system/versions/2');

  await expect(page.getByRole('heading', { level: 2, name: /System\s*v2/ })).toBeVisible();
  await expect(page.getByText('Vary structure, opening and closing between posts.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Version history' })).toBeVisible();
  // The author is an id — never a fabricated display name.
  await expect(page.getByText('usr_owner').first()).toBeVisible();
});

test('comparing two versions shows a REAL diff and Back reverses it', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop comparison pane.');
  await signIn(page);
  await page.goto('/prompts/system/versions/3');

  await page.getByRole('button', { name: 'Compare with v2' }).click();
  await expect(page).toHaveURL(/compare=2/);
  await expect(page.getByRole('heading', { name: 'v2 → v3' })).toBeVisible();
  // Real content, computed from the two stored texts.
  await expect(page.getByText(/Keep sentences short and concrete\./).first()).toBeVisible();
  await expect(page.getByText(/lines? added/)).toBeVisible();

  // A comparison is a real state change: Back reverses it (plan §3.5).
  await page.goBack();
  await expect(page).not.toHaveURL(/compare=/);
  await expect(page.getByRole('heading', { name: 'v2 → v3' })).toHaveCount(0);
});

test('an editor saves a new version and the chain grows — 201 truth, never “queued”', async ({
  page,
}) => {
  await signIn(page, 'editor');
  await page.goto('/prompts/system');

  await page.getByRole('button', { name: 'New version' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Version text').fill('A fourth revision written in the console.');
  await dialog.getByRole('button', { name: 'Save as new version' }).click();

  // The toast title AND the polite announcer both carry the copy (D2 §17), so
  // assert the toast itself — the FS5 lesson.
  await expect(page.getByText('Saved as v4', { exact: true })).toBeVisible();
  await expect(page.getByText(/queued/i)).toHaveCount(0);
  await expect(page).toHaveURL(/\/prompts\/system\/versions\/4/);
  await expect(page.getByRole('heading', { level: 2, name: /System\s*v4/ })).toBeVisible();
  // Append-only: v3 is still in the chain.
  await expect(
    page.getByRole('navigation', { name: 'Version history' }).getByText('v3'),
  ).toBeVisible();
});

test('unsaved composer work survives a reload and is restored', async ({ page }) => {
  await signIn(page, 'editor');
  await page.goto('/prompts/image');

  await page.getByRole('button', { name: 'New version' }).first().click();
  await page.getByRole('dialog').getByLabel('Version text').fill('draft that must survive');

  await page.reload();
  await page.getByRole('button', { name: 'New version' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Version text')).toHaveValue('draft that must survive');
  await expect(dialog.getByText('Restored from your unsaved draft on this device.')).toBeVisible();
});

test('switching the active channel changes NOTHING on this screen (platform-wide)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'The switcher lives in the desktop topbar.');
  await signIn(page);
  await page.goto('/prompts');

  // Compare like with like: the rendered row set, not raw innerText (whose
  // newlines do not survive Playwright's text normalisation).
  const rows = page.getByRole('button', { name: /^Open prompt / });
  const before = await rows.allInnerTexts();
  expect(before.length).toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Switch channel' }).click();
  await page.getByRole('menuitem', { name: 'Daily Brief' }).click();

  // Same library, same URL — prompts carry no channel (plan §5.2 D1).
  await expect(page).toHaveURL(/\/prompts$/);
  await expect(rows).toHaveCount(before.length);
  expect(await rows.allInnerTexts()).toEqual(before);
  await expect(
    page.getByRole('heading', { name: 'Prompts are platform-wide, not per-channel' }).first(),
  ).toBeVisible();
});

test('the contract’s own ?type= facet filters server-side', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop facet row.');
  await signIn(page);
  await page.goto('/prompts');

  await page
    .getByRole('group', { name: 'Filter by prompt type' })
    .getByRole('button', { name: 'Image', exact: true })
    .click();
  await expect(page).toHaveURL(/type=image/);
  await expect(page.getByRole('button', { name: 'Open prompt Image' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open prompt System' })).toHaveCount(0);
});

test('testing a version streams with wire cost and cites the version row', async ({ page }) => {
  await signIn(page, 'editor');
  await page.goto('/prompts/system/versions/3');

  const panel = page.getByRole('region', { name: 'Test this version' });
  await expect(panel.getByTestId('test-prompt-output')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Run test' }).click();

  // Anchor on the wire-cost done marker (the FS6 lesson).
  await expect(panel.getByText(/\$0\./)).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('Generated')).toBeVisible();
  await expect(panel.getByText('System · v3')).toBeVisible();
  await expect(panel.getByText(/confidence/i)).toHaveCount(0);
  // No save path for AI output, and no refine/compare affordance (D8).
  await expect(panel.getByRole('button', { name: /save/i })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /refine|improve|compare models/i })).toHaveCount(
    0,
  );
});

test('palette # shows Prompts as a separate group from Knowledge, Memory and Images', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/dashboard');

  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 });
  }).toPass();

  await page.getByRole('combobox').fill('#s');
  await expect(page.getByRole('group', { name: 'Prompts' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Knowledge' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Memory' })).toBeVisible();

  await page
    .getByRole('option', { name: /System/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/prompts\/system/);
});

test('honest-absence surfaces explain what the contract cannot back', async ({ page }) => {
  await signIn(page);
  await page.goto('/prompts');

  await expect(
    page.getByRole('heading', { name: 'Prompts are platform-wide, not per-channel' }).first(),
  ).toBeVisible();

  await page.goto('/prompts/system');
  await expect(
    page.getByRole('heading', { name: 'Which version is “active” is decided in the backend' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No variables are claimed, because none are defined' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
});

test('an analyst reads the library without a single write or AI affordance', async ({ page }) => {
  await signIn(page, 'analyst');
  await page.goto('/prompts');

  await expect(page.getByRole('heading', { level: 1, name: 'Prompt Library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New version' })).toHaveCount(0);
  await expect(
    page.getByText('Your role reads this library — authoring versions is an editor operation.'),
  ).toBeVisible();

  await page.goto('/prompts/system/versions/3');
  await expect(page.getByText('Testing a version is an editor operation.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run test' })).toHaveCount(0);
});

test('the URL contract is restorable: type, version and inspector survive a reload', async ({
  page,
}) => {
  await signIn(page);

  await page.goto('/prompts/system/versions/2');
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: /System\s*v2/ })).toBeVisible();

  await page.goto('/prompts?inspect=prompt:prm_system_3');
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: /System\s*v3/ })).toBeVisible();
});

test('the empty library renders the canonical D2 §15 state', async ({ page, context }) => {
  await signIn(page, 'editor');
  await context.addCookies([
    { name: 'onyx-fixture-scenario', value: 'empty', url: 'http://localhost:3000' },
  ]);
  await page.goto('/prompts');
  await expect(page.getByRole('heading', { name: 'No prompts yet' })).toBeVisible();
  await expect(page.getByText(/an edit is always a new version/i)).toBeVisible();
});

test('the prompt library and a version detail are accessible (axe)', async ({ page }) => {
  await signIn(page);

  await page.goto('/prompts');
  await expect(page.getByRole('list', { name: 'Prompt types' })).toBeVisible();
  await page.mouse.move(0, 0);
  const listResults = await new AxeBuilder({ page }).analyze();
  expect(listResults.violations, axeMessage(listResults.violations)).toEqual([]);

  await page.goto('/prompts/system/versions/3');
  await expect(page.getByRole('navigation', { name: 'Version history' })).toBeVisible();
  await page.mouse.move(0, 0);
  const detailResults = await new AxeBuilder({ page }).analyze();
  expect(detailResults.violations, axeMessage(detailResults.violations)).toEqual([]);
});
