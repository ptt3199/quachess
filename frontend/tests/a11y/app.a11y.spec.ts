import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/rankings', '/matches', '/admin'];

for (const route of routes) {
  test(`no critical accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
}

test('auth and inbox dialogs are free of critical violations when opened', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  let results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .include('[role="dialog"]')
    .analyze();

  let critical = results.violations.filter((violation) => violation.impact === 'critical');
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
