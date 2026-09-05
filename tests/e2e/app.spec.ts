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

async function openCatchForm(page: import('@playwright/test').Page): Promise<void> {
  const ownCatch = page.getByRole('button', { name: 'Log your own catch' });
  if (await ownCatch.count()) await ownCatch.click();
  else await page.getByRole('button', { name: 'Add catch' }).click();
  await expect(page.getByRole('heading', { name: 'Log the catch' })).toBeVisible();
}

async function saveCatch(page: import('@playwright/test').Page, species = 'Largemouth bass'): Promise<void> {
  await openCatchForm(page);
  await page.getByLabel('Species *').fill(species);
  await page.getByLabel('Rig *').fill('Texas rig, size 3/0');
  await page.getByLabel('Bait or lure *').fill('Green pumpkin worm');
  await page.getByLabel('Water conditions *').fill('Stained, light chop');
  await page.getByLabel('Line / anchor setup *').fill('12 lb fluoro, 45 cm leader');
  await page.getByRole('button', { name: 'Save catch', exact: true }).click();
  await expect(page.getByRole('heading', { name: species })).toBeVisible();
}

test('keeps keyboard operation, route titles, and accessible pages working', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Catch Photo Log — private catch records');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Turn a catch photo into a private record');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to main content')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.locator('footer').getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveTitle('Privacy — Catch Photo Log');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy for your catch log');
  await expect.poll(() => seriousAxeViolations(page)).toEqual([]);
  await page.locator('footer').getByRole('link', { name: 'Terms' }).click();
  await expect(page).toHaveTitle('Terms — Catch Photo Log');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms for using Catch Photo Log');
});

test('@claim:demo-sample loads realistic sample records in one action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Try it with sample data/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByLabel('Demo mode')).toContainText('Demo — sample data, nothing is saved');
  await expect(page.getByRole('heading', { name: 'Smallmouth bass' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rainbow trout' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Channel catfish' })).toBeVisible();
  await expect(page.locator('#stat-catches')).toHaveText('3');
});

test('@claim:demo-isolation keeps sample changes away from a real log', async ({ page }) => {
  await page.goto('/');
  await saveCatch(page, 'Real water bass');
  await page.getByRole('link', { name: 'Try sample' }).click();
  await saveCatch(page, 'Demo-only perch');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Real water bass' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Smallmouth bass' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Try sample' }).click();
  await expect(page.getByRole('heading', { name: 'Demo-only perch' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Smallmouth bass' })).toBeVisible();
});

test('@claim:local-records saves a catch across a reload', async ({ page }) => {
  await page.goto('/');
  await saveCatch(page, 'River perch');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'River perch' })).toBeVisible();
});

test('@claim:photo-details reads selected photo details only on request and falls back to manual entry', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/');
  await openCatchForm(page);
  await page.getByLabel('Add the catch photo').setInputFiles('public/icons/icon-192.png');
  await expect(page.getByText('Photo selected. Details have not been read.')).toBeVisible();
  await page.getByRole('button', { name: 'Read photo details' }).click();
  await expect(page.getByText('No readable date or coordinates found. Enter them manually below.')).toBeVisible();
  expect(new Set(requested.map((url) => new URL(url).origin))).toEqual(new Set([new URL(page.url()).origin]));
});

test('@claim:location-privacy rounds approximate spots and allows a removed spot', async ({ page }) => {
  await page.goto('/');
  await openCatchForm(page);
  await page.getByLabel('Species *').fill('Boundary bass');
  await page.getByLabel('Rig *').fill('Carolina rig');
  await page.getByLabel('Bait or lure *').fill('Soft plastic');
  await page.getByLabel('Water conditions *').fill('Clear');
  await page.getByLabel('Line / anchor setup *').fill('10 lb fluoro');
  await page.getByRole('radio', { name: /Approximate/ }).check();
  await page.getByLabel('Latitude').fill('51.54321');
  await page.getByLabel('Longitude').fill('-0.16789');
  await expect(page.locator('#location-preview')).toContainText('51.5, -0.2');
  await page.getByRole('button', { name: 'Save catch', exact: true }).click();
  await expect(page.getByText('Approx. 51.5, -0.2')).toBeVisible();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('radio', { name: /Remove/ }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Spot removed')).toBeVisible();
});

test('@claim:edit-undo lets an angler change, remove, and restore a catch', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByLabel('Water conditions *').fill('Clear after rain');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Clear after rain')).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remove catch' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Clear after rain')).toBeVisible();
});

test('@claim:csv-export exports one CSV row for each sample catch', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^catch-log-.*\.csv$/);
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv.split('\n')).toHaveLength(4);
  expect(csv).toContain('Smallmouth bass');
});

test('@claim:json-backup exports and imports a complete portable log', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up JSON' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream!) backup += chunk.toString();
  expect(JSON.parse(backup).catches).toHaveLength(3);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Import JSON').setInputFiles('tests/fixtures/catch-log-backup.json');
  await expect(page.getByRole('heading', { name: 'Imported carp' })).toBeVisible();
});

test('@claim:pdf-print sends the populated log to the browser print action', async ({ page }) => {
  await page.goto('/demo');
  await page.evaluate(() => { const state = window as unknown as { printCalls: number }; state.printCalls = 0; window.print = () => { state.printCalls += 1; }; });
  await page.getByRole('button', { name: 'Print / save PDF' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(1);
});

test('@claim:offline-reload works offline after the first demo visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Smallmouth bass' })).toBeVisible();
  await context.close();
});

test('@claim:private-free-path completes without accounts, payments, or third-party requests', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/');
  await saveCatch(page, 'Free log sunfish');
  const origins = new Set(requested.map((url) => new URL(url).origin));
  expect(origins).toEqual(new Set([new URL(page.url()).origin]));
  await expect(page.locator('input[type="email"], input[type="password"], [href*="checkout"]')).toHaveCount(0);
});

test('@claim:theme-switch keeps the chosen night chart after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to night chart' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('shows plain invalid backup guidance, mobile targets, reduced motion, and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/demo');
  await page.getByLabel('Import JSON').setInputFiles('tests/fixtures/broken-backup.json');
  await expect(page.locator('#import-status')).toHaveText('Choose a valid Catch Photo Log backup. Your current log was not changed.');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const target of await page.locator('.brand, footer a, #theme-toggle').all()) {
    const box = await target.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.button.primary').first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('1e-05s');
  expect(errors).toEqual([]);
});
