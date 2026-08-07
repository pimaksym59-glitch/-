import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS14 — the three D4 §3 accessibility checks this project had never executed
 * (STAGE_FS14_PLAN §1 T-FS14.13). axe covers contrast, roles, names and
 * landmarks; it does NOT cover reflow, zoom or motion preference, so those
 * three lines of the checklist have been unverified since FS1.
 *
 * They run inside the existing Playwright gate rather than as an eleventh gate.
 * A failure here is fixed where it is caused — in the screen's own content or
 * call site — never by editing a token value and never in the shared shell
 * (the FS1/FS2/FS5/FS10 usage precedents and the FS7/FS9/FS12 content ones).
 */
async function signIn(page: Page, role = 'owner'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@console.local`);
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Every real screen a journey traverses, plus the two account screens. */
const SCREENS = [
  '/dashboard',
  '/chat',
  '/knowledge',
  '/memory',
  '/studio',
  '/prompts',
  '/analytics',
  '/jobs',
  '/audit',
  '/health',
  '/providers',
  '/billing',
  '/admin',
  '/settings',
  '/profile',
];

/**
 * A page reflows correctly when its DOCUMENT does not scroll sideways. Wide
 * content is allowed to scroll inside its own container (tables, charts, code)
 * — that is the D4 §2 rule, and it is why the check is on the document element
 * rather than on every descendant.
 */
async function documentOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
}

test('320px reflow: no screen forces the document to scroll sideways (D4 §3)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await signIn(page);

  for (const path of SCREENS) {
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    // 1px of tolerance for sub-pixel rounding on fractional layouts.
    expect(await documentOverflow(page), `${path} overflows at 320px`).toBeLessThanOrEqual(1);
  }
});

test('200% zoom: the shell stays usable and nothing overflows (D4 §3)', async ({ page }) => {
  // 200% zoom on a 1280×800 screen is 640×400 CSS pixels — the same thing the
  // browser does, expressed in the units the layout actually sees.
  await page.setViewportSize({ width: 640, height: 400 });
  await signIn(page);

  for (const path of ['/dashboard', '/chat', '/analytics', '/settings']) {
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    expect(await documentOverflow(page), `${path} overflows at 200% zoom`).toBeLessThanOrEqual(1);
  }

  // The primary action of the busiest screen is still reachable, not clipped.
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Compose' })).toBeVisible();
});

test('prefers-reduced-motion: movement is dropped, meaning is kept (D2 §9)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);

  // The route transition drops its animation class entirely under the
  // preference (RouteTransition), so no element animates the page in.
  await page.goto('/analytics');
  await expect(page.locator('.onyx-route-enter')).toHaveCount(0);

  // And the global rule holds for anything that still declares an animation:
  // durations collapse rather than elements disappearing.
  const animated = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter((el) => {
      const style = getComputedStyle(el);
      const duration = parseFloat(style.animationDuration || '0');
      return duration > 0.01;
    }).length;
  });
  expect(animated).toBe(0);

  // The screen is still fully rendered — reduced motion never means less content.
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
});

test('axe reaches the two overlays no scan had ever opened (T-FS14.13)', async ({ page }) => {
  await signIn(page);

  // The avatar menu and the command palette only EXIST in the DOM once opened,
  // so every axe scan in the suite had been blind to them since FS2. That is
  // how an 11px `text.tertiary` role label (3.6:1 in dark) survived five
  // contrast audits — see FS14_REPORT §4.
  await page
    .getByRole('button', { name: /Account|Avatar|Profile menu/ })
    .first()
    .click();
  await expect(page.getByRole('menu')).toBeVisible();
  // Scoped to the overlay itself: scanning the whole page while a modal is
  // open reports page-structure rules (landmark-one-main, region,
  // page-has-heading-one) about the aria-hidden backdrop, not about the
  // surface under test — the same scoping convention every other axe check in
  // this suite uses.
  const menu = await new AxeBuilder({ page }).include('[role="menu"]').analyze();
  expect(
    menu.violations.map((v) => v.id),
    JSON.stringify(menu.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }))),
  ).toEqual([]);
  await page.keyboard.press('Escape');

  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  const palette = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-label="Command palette"]')
    .analyze();
  expect(
    palette.violations.map((v) => v.id),
    JSON.stringify(palette.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }))),
  ).toEqual([]);
});
