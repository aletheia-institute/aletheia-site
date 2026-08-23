// Visual regression: reduced-motion renders are deterministic, so they are the
// baseline surface. Platform-scoped snapshots; CI baselines are produced by the
// update-baselines workflow (until then, CI skips gracefully).
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function settle(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.grain{display:none!important} .aurora{animation:none!important}' });
}

function skipIfNoBaseline(testInfo, name) {
  const p = testInfo.snapshotPath(name);
  test.skip(!!process.env.CI && !existsSync(p),
    `no ${name} baseline for this platform — run the update-baselines workflow`);
}

test('hero (still edition)', async ({ page }, testInfo) => {
  skipIfNoBaseline(testInfo, 'hero.png');
  await settle(page);
  await expect(page.locator('#hero')).toHaveScreenshot('hero.png');
});

test('tiers', async ({ page }, testInfo) => {
  skipIfNoBaseline(testInfo, 'tiers.png');
  await settle(page);
  await page.locator('.tiers').scrollIntoViewIfNeeded();
  await expect(page.locator('.tiers')).toHaveScreenshot('tiers.png');
});

test('inquiry', async ({ page }, testInfo) => {
  skipIfNoBaseline(testInfo, 'inquiry.png');
  await settle(page);
  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await expect(page.locator('#inquiry')).toHaveScreenshot('inquiry.png');
});
