// Production smoke: real browser, real first visit, organic scrolling,
// against the live domain. Opt-in: LIVE=1 npm run test:live
import { test, expect } from '@playwright/test';
test.skip(!process.env.LIVE, 'set LIVE=1 to smoke the production domain');
test.use({ baseURL: 'https://aletheiainstitute.ai' });
test('LIVE first visit: loader releases, scroll works, content reveals', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('https://aletheiainstitute.ai/');
  // first visit: loader plays for real
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 12000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('nav')).toBeVisible();
  const kickerOp = await page.locator('.hero-kicker').evaluate(el => getComputedStyle(el).opacity);
  console.log('HERO KICKER OPACITY:', kickerOp);
  // organic scroll like a human
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(120); }
  await page.waitForTimeout(1200);
  const secOp = await page.locator('#services .sec').evaluate(el => getComputedStyle(el).opacity);
  const tierVisible = await page.locator('.tier').first().isVisible();
  console.log('SERVICES HEADING OPACITY:', secOp, '| tier visible:', tierVisible);
  console.log('PAGE ERRORS:', errors);
  await page.screenshot({ path: 'test-results/live-smoke.png' });
  expect(Number(secOp)).toBeGreaterThan(0.9);
  expect(errors).toEqual([]);
});
