import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS9 Image Studio journeys (D3 §9 / STAGE_FS9_PLAN §4 T-FS9.12) on the
 * deterministic fixtures: the record grid with wire-derived chips, the record
 * deep link with prompt/parameters/scene, the REAL §R6.4 similarity report and
 * §R6.5 attempt history, the 202 regeneration intent, the guarded soft delete,
 * the §R6.1 reference upload, explain-verification with image provenance, the
 * palette `#` Images group kept separate from Knowledge and Memory, read-only
 * roles, the honest-absence surfaces, URL reversibility (§3.5) — plus axe.
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

test('the studio grid shows real records with wire-derived chips only', async ({ page }) => {
  await signIn(page);
  await page.goto('/studio');

  await expect(page.getByRole('heading', { level: 1, name: 'Image Studio' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Image records' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open image record img_tech_1' })).toBeVisible();

  // Verification comes from the record's own status — never a fabricated chip.
  await expect(page.getByText('Verified').first()).toBeVisible();
  await expect(page.getByText('Needs Review').first()).toBeVisible();
  await expect(page.getByText(/safety ok/i)).toHaveCount(0);

  // An unknown wire status is surfaced raw, never coerced into the vocabulary.
  await expect(page.getByText('post_processing')).toBeVisible();

  // No pixels are invented: the contract serves no binary (§R6.8).
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.getByText('Stored in object storage').first()).toBeVisible();
});

test('j/k moves between cards and the inspector affordance uses the URL contract', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop grid variant.');
  await signIn(page);
  await page.goto('/studio');

  // The grid is sorted NEWEST FIRST (img_tech_3 · img_tech_2 · img_tech_1),
  // so `j` from the newest record moves to the one below it.
  const first = page.getByRole('button', { name: 'Open image record img_tech_3' });
  const second = page.getByRole('button', { name: 'Open image record img_tech_2' });
  await first.focus();
  await page.keyboard.press('j');
  await expect(second).toBeFocused();
  await page.keyboard.press('k');
  await expect(first).toBeFocused();

  await page.getByRole('button', { name: 'Inspect image record img_tech_1' }).click();
  await expect(page).toHaveURL(/inspect=image%3Aimg_tech_1|inspect=image:img_tech_1/);
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('img_tech_1')).toBeVisible();
});

test('the record deep link shows prompt, parameters, scene, history and the report', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/studio/img_tech_1');

  await expect(page.getByRole('heading', { name: 'img_tech_1' })).toBeVisible();
  await expect(page.getByText(/Editorial portrait of the host/).first()).toBeVisible();
  await expect(page.getByText('Negative:')).toBeVisible();

  // Generation parameters (§R6.8 metadata) and the resolved scene. Scoped to
  // their sections: "Seed" also appears in the attempt details below.
  const params = page.getByRole('region', { name: 'Generation parameters' });
  await expect(params.getByText('Seed')).toBeVisible();
  await expect(params.getByText('812004')).toBeVisible();
  const scene = page.getByRole('region', { name: 'Scene' });
  await expect(scene.getByText('Home studio')).toBeVisible();

  // §R6.5 — every attempt the backend recorded.
  await expect(page.getByRole('list', { name: 'Generation attempts' })).toBeVisible();
  await expect(page.getByText(/2 attempts recorded/)).toBeVisible();

  // §R6.4 — the REAL three-mechanism report, grouped, with the unknown key raw.
  await expect(page.getByText(/Perceptual hash — near-duplicate detection/)).toBeVisible();
  await expect(page.getByText(/CLIP embedding — semantic similarity/)).toBeVisible();
  await expect(page.getByText('0.412')).toBeVisible();
  await expect(page.getByText('face_match_distance')).toBeVisible();
  await expect(page.getByText('(raw key)').first()).toBeVisible();

  // The safety honesty surface sits with the report — no verdict is invented.
  await expect(
    page.getByRole('heading', { name: 'Safety checks are backend-side and not exposed' }),
  ).toBeVisible();
});

test('regeneration is a QUEUED intent and the record polls back to a terminal state', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/studio/img_tech_1');

  await page.getByRole('button', { name: 'Regenerate' }).first().click();
  await expect(page.getByText('Regeneration queued', { exact: true })).toBeVisible();
  await expect(page.getByText(/task task_regen_img_tech_1/).first()).toBeVisible();

  // The honest truth: the worker owns it; the record shows queued, then flips
  // to a terminal status through polling — no progress bar is ever invented.
  await expect(page.getByText('Queued').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[role="progressbar"]')).toHaveCount(0);
  await expect(page.getByText(/3 attempts recorded/)).toBeVisible({ timeout: 15_000 });
});

test('deleting a record is guarded and soft', async ({ page }) => {
  await signIn(page);
  await page.goto('/studio/img_tech_2');

  await page.getByRole('button', { name: 'Delete image record' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/soft-deleted/i)).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Image deleted', { exact: true })).toBeVisible();
});

test('actor references upload honestly — Queued then Verified, never a percentage', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/studio?panel=references');

  await expect(page.getByRole('heading', { name: 'Actor references' })).toBeVisible();
  await page.getByRole('button', { name: 'Add references' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/identity conditioning, not a text description/)).toBeVisible();
  await expect(dialog.getByText(/Actors are fictional characters/)).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'face-front.png',
    mimeType: 'image/png',
    buffer: Buffer.from('reference-bytes'),
  });

  await expect(dialog.getByText('Verified')).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/1 reference accepted/)).toBeVisible();
  await expect(dialog.locator('[role="progressbar"]')).toHaveCount(0);
  await expect(dialog.getByText(/%/)).toHaveCount(0);
});

test('palette # shows Knowledge, Memory and Images as SEPARATE groups', async ({ page }) => {
  await signIn(page);
  await page.goto('/studio');

  // ⌘K can race hydration on a hard navigation (the FS6 recorded pitfall) —
  // retry until the listener is attached.
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });

  // A query that matches ALL THREE surfaces proves they never merge.
  await page.getByRole('combobox').fill('#e');
  await expect(dialog.getByText('Knowledge', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Memory', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Images', { exact: true })).toBeVisible();

  await page.getByRole('combobox').fill('#rooftop');
  await page.getByRole('option', { name: /Rooftop skyline at dusk/ }).click();
  await expect(page).toHaveURL(/\/studio\/img_tech_2/);
});

test('explain-verification streams with wire cost and cites the REAL image record', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/studio/img_tech_1');

  await page.getByRole('button', { name: 'Explain the checks' }).click();

  const output = page.getByTestId('explain-verification-output');
  await expect(output.getByText('$0.0042')).toBeVisible({ timeout: 15_000 });
  await expect(
    output.getByText(/You asked: Answer a question about ONE generated image/),
  ).toBeVisible();

  await expect(output.getByText('Generated', { exact: true })).toBeVisible();
  await expect(output.getByText('Image record img_tech_1')).toBeVisible();

  await output.getByRole('button', { name: /Why this output/ }).click();
  await expect(
    output.getByText(/cannot tell you whether the image passed safety checks/),
  ).toBeVisible();
});

test('honest-absence surfaces explain what the contract cannot back', async ({ page }) => {
  await signIn(page);
  await page.goto('/studio');

  await expect(
    page.getByRole('heading', { name: 'Generation runs in the pipeline, not here' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Generate$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Attach to post/ })).toHaveCount(0);

  await page.goto('/studio/img_tech_1');
  await expect(
    page.getByRole('heading', { name: 'The picture itself is served by object storage' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Accept$/ })).toHaveCount(0);
});

test('URL contract is reversible: panel, deep link and inspector restore on reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);
  await page.goto('/studio');

  // Switching panels PUSHES history, so Back reverses it (the FS8 lesson).
  await page.getByRole('button', { name: 'References' }).click();
  await expect(page).toHaveURL(/panel=references/);
  await expect(page.getByRole('heading', { name: 'Actor references' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('list', { name: 'Image records' })).toBeVisible();

  await page.goto('/studio?inspect=image:img_tech_1');
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('img_tech_1')).toBeVisible();
  await page.reload();
  await expect(inspector.getByText('img_tech_1')).toBeVisible();
});

test('analyst reads the studio without a single write or AI affordance', async ({ page }) => {
  await signIn(page, 'analyst');
  await page.goto('/studio');

  await expect(page.getByRole('heading', { level: 1, name: 'Image Studio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open image record img_tech_1' })).toBeVisible();
  await expect(
    page.getByText(/regenerating and uploading references are editor operations/),
  ).toBeVisible();

  await page.goto('/studio/img_tech_1');
  await expect(page.getByRole('button', { name: 'Regenerate' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Explain the checks' })).toHaveCount(0);

  // `r` must be inert for a read role.
  await page.keyboard.press('r');
  await expect(page.getByText('Regeneration queued')).toHaveCount(0);
});

test('the studio grid and record detail are accessible (axe)', async ({ page }) => {
  await signIn(page);
  await page.goto('/studio');
  await expect(page.getByRole('button', { name: 'Open image record img_tech_1' })).toBeVisible();
  await page.mouse.move(0, 0);
  const gridResults = await new AxeBuilder({ page }).analyze();
  expect(gridResults.violations, axeMessage(gridResults.violations)).toEqual([]);

  await page.goto('/studio/img_tech_1');
  await expect(page.getByText(/Perceptual hash — near-duplicate detection/)).toBeVisible();
  await page.mouse.move(0, 0);
  const detailResults = await new AxeBuilder({ page }).analyze();
  expect(detailResults.violations, axeMessage(detailResults.violations)).toEqual([]);
});
