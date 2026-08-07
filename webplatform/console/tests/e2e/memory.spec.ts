import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS8 Memory journeys (D3 §8 / STAGE_FS8_PLAN §4 T-FS8.12) on the deterministic
 * fixtures: kind-grouped memory, the persona deep link with Style Memory,
 * guarded edit + archive, the palette `#` showing Knowledge and Memory as
 * SEPARATE groups (§2), explain-style with a persona-provenance MemoryCard,
 * read-only roles, the honest-absence surfaces, URL reversibility (§3.5) —
 * plus axe.
 *
 * Sharp edges honoured (PART3 §3.3): role **+ level** for headings near
 * embedded content · `{ exact: true }` for substring-prone labels · anchor
 * post-stream assertions on the wire-cost done marker · scope `.first()` to a
 * visible region on mobile single-pane screens.
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

test('memory groups entries by kind, archived history included', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory');

  await expect(page.getByRole('heading', { level: 1, name: 'Memory' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Persona · the writing voice/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Actors · the visual identity/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Published posts/ })).toBeVisible();

  await expect(page.getByText('The calm senior engineer')).toBeVisible();
  await expect(page.getByText('Nadia, the systems lead')).toBeVisible();
  // Archived personas stay visible — memory is history, not a current list.
  await expect(page.getByText('Early enthusiast voice')).toBeVisible();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  // Content memory comes from real published posts.
  await expect(page.getByText('Morning digest №214')).toBeVisible();
});

test('j/k moves within a group and ↵ opens the persona deep link', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop two-pane variant.');
  await signIn(page);
  await page.goto('/memory');

  const row0 = page.locator('ul[aria-label="Personas"] button[data-row-index="0"]');
  const row1 = page.locator('ul[aria-label="Personas"] button[data-row-index="1"]');
  await row0.focus();
  await page.keyboard.press('j');
  await expect(row1).toBeFocused();
  await page.keyboard.press('k');
  await expect(row0).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/memory\/persona_tech$/);
  await expect(
    page.getByRole('heading', { level: 3, name: 'The calm senior engineer' }),
  ).toBeVisible();
});

test('the persona deep link shows the voice and derived Style Memory', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory/persona_tech');

  // Scope to the detail region: the same voice line also previews in the list
  // row (a strict-mode collision otherwise).
  const detail = page.getByLabel('Memory detail');
  await expect(
    page.getByRole('heading', { level: 3, name: 'The calm senior engineer' }),
  ).toBeVisible();
  await expect(
    detail.getByText('Short declarative sentences. One number per claim.'),
  ).toBeVisible();
  await expect(page.getByText('Average sentence length')).toBeVisible();
  await expect(page.getByText('14.20')).toBeVisible();
  // An unknown backend key renders honestly rather than being dropped.
  await expect(page.getByText('hedging_ratio')).toBeVisible();
  await expect(page.getByText('(raw key)')).toBeVisible();
  await expect(page.getByText(/parameters, not stored posts/)).toBeVisible();
});

test('guarded edit saves the voice and states the audit truth', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory/persona_tech');

  await page.getByRole('button', { name: /Edit voice/ }).click();
  const manner = page.getByLabel('Manner of speech');
  await manner.fill('Even shorter. Still one number per claim.');
  await page.getByRole('button', { name: 'Save voice' }).click();

  await expect(page.getByText('Persona updated', { exact: true })).toBeVisible();
  await expect(page.getByText(/audit log/).first()).toBeVisible();
  await expect(
    page.getByLabel('Memory detail').getByText('Even shorter. Still one number per claim.'),
  ).toBeVisible();
});

test('palette # shows Knowledge and Memory as SEPARATE groups', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory');

  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();

  // A query that matches BOTH surfaces proves they never merge into one group.
  await page.getByRole('combobox').fill('#e');
  await expect(dialog.getByText('Knowledge', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Memory', { exact: true })).toBeVisible();

  await page.getByRole('combobox').fill('#calm');
  await page.getByRole('option', { name: /The calm senior engineer/ }).click();
  await expect(page).toHaveURL(/\/memory\/persona_tech/);
});

test('explain-style streams with wire cost and cites the REAL persona record', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory/persona_tech');

  await page.getByRole('button', { name: /Explain this persona’s voice/ }).click();
  await page.getByRole('button', { name: 'Explain the voice' }).click();

  const output = page.getByTestId('explain-style-output');
  await expect(output.getByText('$0.0042')).toBeVisible({ timeout: 15_000 });
  await expect(
    output.getByText(/You asked: Answer a question about ONE writing persona/),
  ).toBeVisible();

  await expect(output.getByText('Generated', { exact: true })).toBeVisible();
  await expect(output.getByText('Persona', { exact: true })).toBeVisible();
  await expect(output.getByText(/derived style features included/)).toBeVisible();

  // No influence claim is offered anywhere on the surface.
  await expect(page.getByText(/which memory shaped a specific post/).first()).toHaveCount(0);
  await output.getByRole('button', { name: /Why this output/ }).click();
  await expect(
    output.getByText(/cannot tell you which memory shaped a specific post/),
  ).toBeVisible();
});

test('honest-absence surfaces: trace and Global scope explain themselves', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory');

  await page.getByRole('button', { name: 'Global' }).click();
  await expect(page).toHaveURL(/scope=global/);
  await expect(page.getByRole('heading', { name: 'Global memory is backend-owned' })).toBeVisible();
  await expect(page.getByText('The calm senior engineer')).toHaveCount(0);

  // Reversible: Back returns to the channel scope with the list intact.
  await page.goBack();
  await expect(page.getByText('The calm senior engineer')).toBeVisible();

  await page.goto('/memory/persona_tech');
  await expect(page.getByRole('heading', { name: 'Influence trace' })).toBeVisible();
  await expect(page.getByText(/never asks the model to invent one/)).toBeVisible();
});

test('URL contract is reversible: inspector, deep link and filters restore on reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);

  await page.goto('/memory?inspect=persona:persona_tech');
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('The calm senior engineer')).toBeVisible();
  await expect(inspector.getByText('Average sentence length')).toBeVisible();

  await page.goto('/memory?inspect=actor:actor_tech');
  await expect(inspector.getByText('Nadia, the systems lead')).toBeVisible();
  // Persona ≠ Actor: the actor view never shows voice data.
  await expect(inspector.getByText('Short declarative sentences.')).toHaveCount(0);

  await page.reload();
  await expect(inspector.getByText('Nadia, the systems lead')).toBeVisible();
});

test('analyst reads memory without a single write or AI affordance', async ({ page }) => {
  await signIn(page, 'analyst');
  await page.goto('/memory');

  await expect(page.getByRole('heading', { level: 1, name: 'Memory' })).toBeVisible();
  await expect(page.getByText('The calm senior engineer')).toBeVisible();
  await expect(page.getByText(/editing a persona is an editor operation/)).toBeVisible();

  await page.goto('/memory/persona_tech');
  await expect(page.getByText('Average sentence length')).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit voice/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Explain this persona’s voice/ })).toHaveCount(0);

  // `e` must be inert for a read role.
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: /Edit/ })).toHaveCount(0);
});

test('the memory list and persona detail are accessible (axe)', async ({ page }) => {
  await signIn(page);
  await page.goto('/memory');
  await expect(page.getByText('The calm senior engineer')).toBeVisible();
  await page.mouse.move(0, 0);
  const listResults = await new AxeBuilder({ page }).analyze();
  expect(listResults.violations, axeMessage(listResults.violations)).toEqual([]);

  await page.goto('/memory/persona_tech');
  await expect(page.getByText('Average sentence length')).toBeVisible();
  await page.mouse.move(0, 0);
  const detailResults = await new AxeBuilder({ page }).analyze();
  expect(detailResults.violations, axeMessage(detailResults.violations)).toEqual([]);
});
