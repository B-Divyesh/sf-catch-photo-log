import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('logs, persists, edits and removes a private catch', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catch Photo Log');
  await expect(page.getByText('No field sheets yet')).toBeVisible();
  await page.getByRole('button', { name: 'Log a catch', exact: true }).click();
  await page.getByLabel('Add the catch photo').setInputFiles('public/icons/icon-192.png');
  await page.getByRole('button', { name: 'Read photo details' }).click();
  await expect(page.getByText(/No readable date or coordinates found/)).toBeVisible();
  await page.getByLabel('Species *').fill('Largemouth bass');
  await page.getByLabel('Rig *').fill('Texas rig, 3/0');
  await page.getByLabel('Bait or lure *').fill('Green pumpkin worm');
  await page.getByLabel('Water conditions *').fill('Stained, light chop');
  await page.getByLabel('Line / anchor setup *').fill('12 lb fluoro, 45 cm leader');
  await page.getByLabel('What changed or worked?').fill('Slow retrieve beside the reeds.');
  await page.getByRole('button', { name: 'Save catch', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Largemouth bass' })).toBeVisible();
  await expect(page.getByAltText('Photo attached to Largemouth bass record')).toBeVisible();
  await expect(page.getByText('Spot removed')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Largemouth bass' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Water conditions *').fill('Clear, calm');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Clear, calm')).toBeVisible();

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remove catch' }).click();
  await expect(page.getByText('No field sheets yet')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Largemouth bass' })).toBeVisible();
});

test('has no serious accessibility violations and legal pages resolve', async ({ page }) => {
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => {
    const axeApi = (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ impact: string | null }> }> } }).axe;
    return axeApi.run();
  });
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy, by design' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Plain-language terms' })).toBeVisible();
});

test('works at 390px and keeps the form keyboard-accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  await page.getByRole('button', { name: 'Log a catch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Add the catch photo')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Log the catch' })).toBeVisible();
});

test('reloads the application shell offline', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catch Photo Log');
  await expect(page.getByText('Offline now')).toBeVisible();
});

test('loads without browser console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('restores a fresh cached Field Kit license without blocking first paint', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('sb_license:catch-photo-log', 'test-token');
    localStorage.setItem('sb_license:catch-photo-log:verdict', JSON.stringify({ valid: true, checkedAt: Date.now(), reason: 'ok' }));
  });
  await page.reload();
  await expect(page.getByText('Field Kit active').first()).toBeVisible();
  await page.getByRole('button', { name: 'Log a catch', exact: true }).click();
  await expect(page.getByLabel('Use a Field Kit preset')).toBeVisible();
});
