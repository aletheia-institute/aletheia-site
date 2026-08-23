// The Still Edition: reduced motion is art direction, not amputation.
import { test, expect } from '@playwright/test';

// page.emulateMedia (not test.use) — must land before the page's scripts run
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('no loader, content immediately visible', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await expect(page.locator('#loader')).toHaveCount(0);
  await expect(page.locator('.hero-title')).toBeVisible();
  const op = await page.locator('#services .kicker').evaluate(el => getComputedStyle(el).opacity);
  expect(Number(op)).toBe(1);
});

test('the seal still presides — static, drawn, in the constellation\'s place', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await expect(page.locator('#constellation')).toHaveCount(0);   // canvas removed
  await expect(page.locator('.hero-seal-static')).toBeVisible(); // composition remains
});

test('manifesto is fully legible without scrolling theatrics', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await page.locator('#manifesto-text').scrollIntoViewIfNeeded();
  const op = await page.locator('#manifesto-text .w').first()
    .evaluate(el => getComputedStyle(el).opacity);
  expect(Number(op)).toBe(1);
});

test('terminal renders exchanges instantly', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await page.locator('#demo .terminal').scrollIntoViewIfNeeded();
  await expect(page.locator('#term-body .cite').first()).toContainText('your scheduling DB', { timeout: 6000 });
});
