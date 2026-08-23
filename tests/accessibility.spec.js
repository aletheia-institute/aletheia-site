// Human behavior is part of the spec: axe scans, keyboard paths, SR safety.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoSettled } from './helpers.js';

test('axe: no serious or critical violations on the settled page', async ({ page }) => {
  await gotoSettled(page);
  await page.waitForTimeout(1200);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([]);
});

test('skip link is first tab stop and works', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path');
  await gotoSettled(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('a.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('main');
});

test('focus-visible paints gold on keyboard focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path');
  await gotoSettled(page);
  await page.keyboard.press('Tab');            // skip link
  await page.keyboard.press('Tab');            // first nav link
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    return getComputedStyle(el).outlineColor;
  });
  expect(outline).toBe('rgb(122, 94, 42)');  // Ledger Bronze — gold's voice on paper
});

test('terminal presentation is hidden from AT; announcements are whole', async ({ page }) => {
  await gotoSettled(page);
  await expect(page.locator('#term-body')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#term-live')).toHaveAttribute('aria-live', 'polite');
});

test('mobile menu toggle carries correct ARIA state', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile affordance');
  await gotoSettled(page);
  const toggle = page.locator('#nav-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', 'Menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-hidden', 'false');
});

test('decorative layers are hidden from AT', async ({ page }) => {
  await gotoSettled(page);
  for (const sel of ['#constellation', '.atmosphere', '.grain', '#progress', '#cursor', '.scroll-hint']) {
    await expect(page.locator(sel).first()).toHaveAttribute('aria-hidden', 'true');
  }
});

test('heading order is sane: one h1, sections lead with h2', async ({ page }) => {
  await gotoSettled(page);
  expect(await page.locator('h1').count()).toBe(1);
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3')].map(h => Number(h.tagName[1])));
  let prev = 0;
  for (const lvl of order) {
    expect(lvl - prev, `heading jumped from h${prev} to h${lvl}`).toBeLessThanOrEqual(1);
    prev = lvl;
  }
});
