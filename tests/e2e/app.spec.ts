import { expect, test } from '@playwright/test';
import axe from 'axe-core';

type AxeViolation = { id: string; impact: string | null };

async function seriousAxeViolations(page: import('@playwright/test').Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const axeApi = (window as unknown as { axe: { run: () => Promise<{ violations: AxeViolation[] }> } }).axe;
    const results = await axeApi.run();
    return results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  });
}

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
  await expect.poll(() => seriousAxeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Switch to night chart' }).click();
  await expect.poll(() => seriousAxeViolations(page)).toEqual([]);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy, by design' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect.poll(() => seriousAxeViolations(page)).toEqual([]);
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Plain-language terms' })).toBeVisible();
});

test('keeps service-worker toast contrast accessible throughout its entrance', async ({ page }) => {
  await page.evaluate(() => {
    const toast = document.querySelector<HTMLElement>('#toast')!;
    toast.innerHTML = '<span>Catch Photo Log is ready for offline use.</span>';
    toast.hidden = false;
    const animation = toast.getAnimations()[0];
    animation?.pause();
    if (animation) animation.currentTime = 90;
  });
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toast')).toHaveCSS('opacity', '1');
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('works at 390px and keeps the form keyboard-accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Log a catch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Add the catch photo')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Log the catch' })).toBeVisible();
});

test('operates validation, confirmation, and undo entirely from the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Log a catch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Species *').fill('River perch');
  await page.getByLabel('Rig *').fill('Float rig');
  await page.getByLabel('Bait or lure *').fill('Worm');
  await page.getByLabel('Water conditions *').fill('Clear and slow');
  await page.getByLabel('Line / anchor setup *').fill('6 lb mono');
  await page.getByRole('radio', { name: /Exact/ }).check();
  await page.getByRole('button', { name: 'Save catch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Add coordinates or choose “Remove” for the location.');
  await page.getByRole('radio', { name: /Remove/ }).check();
  await page.getByRole('button', { name: 'Save catch', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'River perch' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Keep catch' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Remove catch' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('No field sheets yet')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'River perch' })).toBeVisible();
});

test('updates its versioned cache and reloads app routes offline', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'APP_UPDATED' } })));
  await expect(page.getByText('An update is ready. Reload for the newest field sheet.')).toBeVisible();
  expect(await page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(['catch-log-v3-shell', 'catch-log-v3-assets']));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(true);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catch Photo Log');
  await expect(page.getByRole('heading', { name: 'Privacy, by design' })).toBeVisible();
  await page.goto('/');
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

test('uses the production product identity and removes an invalid returned license', async ({ page }) => {
  const verifyUrl = 'https://api.sociobot.in/api/v1/products/catch-photo-log/verify?license=invalid-token';
  await page.route(verifyUrl, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'invalid', expires_at: null }) }));
  await page.goto('/?source=checkout&license=invalid-token');
  await expect(page).toHaveURL(/\?source=checkout$/);
  await expect(page.getByText('Free field sheet')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb_license:catch-photo-log'))).toBeNull();
  await expect(page.getByRole('link', { name: 'Buy Field Kit' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/catch-photo-log/checkout');
});

test('makes no third-party requests during the private free experience', async ({ page }) => {
  const origins = await page.evaluate(() => [...new Set(performance.getEntriesByType('resource').map((entry) => new URL(entry.name).origin))]);
  expect(origins).toEqual([new URL(page.url()).origin]);
  expect(await page.locator('script[src^="http"], link[href^="http"], img[src^="http"]').count()).toBe(0);
});
