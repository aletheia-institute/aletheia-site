// The page loads clean: no errors, no external calls, everything renders.
import { test, expect } from '@playwright/test';
import { gotoSettled, trackExternalRequests, trackConsoleErrors } from './helpers.js';

test('loads with zero console errors and zero external requests', async ({ page }) => {
  const external = trackExternalRequests(page);
  const errors = trackConsoleErrors(page);
  await gotoSettled(page);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('no request on the page fails', async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await gotoSettled(page);
  await page.waitForTimeout(1000);
  expect(failed).toEqual([]);
});

test('title, meta, favicon', async ({ page }) => {
  await gotoSettled(page);
  await expect(page).toHaveTitle(/Aletheia Institute/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', 'assets/seal.svg');
});

test('hero renders: headline, motto, CTAs, sized canvas', async ({ page, isMobile }) => {
  await gotoSettled(page);
  await expect(page.locator('.hero-title')).toContainText('Talk to');
  await expect(page.locator('.hero-motto')).toContainText('VERITAS EX DATIS');
  await expect(page.locator('.hero-cta .btn-gold')).toBeVisible();
  const box = await page.locator('#constellation').boundingBox();
  expect(box.width).toBeGreaterThan(isMobile ? 300 : 1000);
  expect(box.height).toBeGreaterThan(500);
});

test('nav appears after ready and gains backdrop on scroll', async ({ page }) => {
  await gotoSettled(page);
  await expect(page.locator('nav')).toBeVisible();
  await page.mouse.wheel(0, 600);
  await expect(page.locator('nav.scrolled')).toHaveCount(1, { timeout: 5000 });
});

test('first visit: loader draws and releases within its failsafe window', async ({ page }) => {
  // no skipLoader: exercise the real first-visit path
  await page.goto('/');
  await expect(page.locator('#loader')).toBeVisible();
  await page.waitForFunction(() => !document.getElementById('loader'), null, { timeout: 8000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 8000 });
  await expect(page.locator('.hero-title')).toBeVisible();
});

test('manifesto words exist and carry the We-partner message', async ({ page }) => {
  await gotoSettled(page);
  const text = await page.locator('#manifesto-text').textContent();
  expect(text).toContain('We partner with enterprise leaders');
  expect(text).not.toContain('I partner');
  expect(await page.locator('#manifesto-text .w').count()).toBeGreaterThan(60);
  // DOM surgery must preserve the gold emphasis spans
  expect(await page.locator('#manifesto-text .em').count()).toBe(2);
});

test('no element forces horizontal overflow — the layout never exceeds the viewport', async ({ page }) => {
  await gotoSettled(page);
  const { vw, sw, culprits } = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const culprits = [];
    if (sw > vw + 2) {
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && r.width > 10 && r.right > vw + 4) {
          culprits.push(`${el.tagName}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`);
        }
      });
    }
    return { vw, sw, culprits: culprits.slice(0, 8) };
  });
  expect(sw, `layout ${sw}px exceeds viewport ${vw}px — culprits: ${culprits.join(' | ')}`)
    .toBeLessThanOrEqual(vw + 2);
});

test('scrolling to the end reaches inquiry and footer intact', async ({ page }) => {
  await gotoSettled(page);
  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await expect(page.locator('#inq-body input#inq-field')).toBeVisible();
  await page.locator('footer .fine').scrollIntoViewIfNeeded();
  await expect(page.locator('footer .promise')).toContainText('This site calls no one');
  await expect(page.locator('footer .made')).toContainText('human intent, machine leverage');
});

test('principles heading is never overlapped by its parallaxing cards', async ({ page }) => {
  await gotoSettled(page);
  await page.locator('#principles h2.sec').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);   // let the scrub settle at this position
  const gap = await page.evaluate(() => {
    const h = document.querySelector('#principles h2.sec').getBoundingClientRect();
    const card = document.querySelector('#principles .pr').getBoundingClientRect();
    return card.top - h.bottom;
  });
  expect(gap).toBeGreaterThan(4);   // the p's descender must breathe
});

test('hero descenders are never clipped by the reveal mask', async ({ page }) => {
  await gotoSettled(page);
  // wait for the entrance reveal to finish (clearProps removes the transform)
  await page.waitForFunction(() => {
    const s = document.querySelectorAll('.hero-title .line')[1].querySelector('span');
    return getComputedStyle(s).transform === 'none';
  }, null, { timeout: 8000 });
  // the mask line must extend past the glyph box of its inner span
  const ok = await page.evaluate(() => {
    const line = document.querySelectorAll('.hero-title .line')[1];
    const span = line.querySelector('span');
    return line.getBoundingClientRect().bottom - span.getBoundingClientRect().bottom;
  });
  expect(ok).toBeGreaterThan(8);   // generous padding room for Fraunces descenders
});
