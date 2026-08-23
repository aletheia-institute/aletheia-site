// Every interactive feature, exercised for real.
import { test, expect } from '@playwright/test';
import { gotoSettled } from './helpers.js';

test.describe('demo terminal', () => {
  test('types, skips on click, continues to the second exchange exactly once', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#demo .terminal').scrollIntoViewIfNeeded();
    // typing begins
    await expect(page.locator('#term-body .q').first()).toContainText('GI patients', { timeout: 10000 });
    // click-to-skip completes the exchange fast
    await page.locator('#term-body').click();
    await page.locator('#term-body').click();
    await expect(page.locator('#term-body .cite').first()).toContainText('your scheduling DB', { timeout: 15000 });
    // screen readers got ONE clean announcement, not characters
    await expect(page.locator('#term-live')).toContainText('Question:', { timeout: 5000 });
    // ASK ANOTHER appears, is clickable exactly now
    const next = page.locator('#term-next');
    await expect(next).toBeVisible();
    await next.click();
    await page.locator('#term-body').click();
    await page.locator('#term-body').click();
    await expect(page.locator('#term-body .cite').nth(1)).toContainText('your PM system', { timeout: 15000 });
    // no third exchange exists: the button must not reappear
    await expect(next).not.toBeVisible();
  });
});

test.describe('ask this page (⌘K)', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard palette is a desktop affordance');

  test('opens with Ctrl+K, searches the page, reveals the evidence, closes with Escape', async ({ page }) => {
    await gotoSettled(page);
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    // empty query lists the page's own table of contents
    expect(await page.locator('#palette-results .hit').count()).toBeGreaterThan(3);
    // retrieval over the page's own copy
    await page.locator('#palette-input').fill('firewall');
    await expect(page.locator('#palette-results .hit .sec-tag').first()).toContainText('§');
    await page.keyboard.press('Enter');
    await expect(page.locator('#palette')).not.toBeVisible();
    await expect(page.locator('.flash-target')).toHaveCount(1);
    // reopen, Escape closes and restores focus to the trigger
    await page.locator('#cmdk-btn').click();
    await expect(page.locator('#palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).not.toBeVisible();
    await expect(page.locator('#cmdk-btn')).toBeFocused();
  });

  test('a question with no answer on the page points to hello@', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#cmdk-btn').click();
    await page.locator('#palette-input').fill('zzzqx nonexistent');
    await expect(page.locator('#palette-results .hit .txt')).toContainText('hello@');
  });
});

test.describe('easter egg', () => {
  test.skip(({ isMobile }) => isMobile, 'typed easter egg is a keyboard affordance');

  test("typing 'aletheia' flashes the kicker in Greek", async ({ page }) => {
    await gotoSettled(page);
    await page.locator('body').click({ position: { x: 10, y: 400 } });
    await page.keyboard.type('aletheia', { delay: 30 });
    await expect(page.locator('.hero-kicker.flash')).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator('.hero-kicker')).toContainText('ΑΛΗΘΕΙΑ');
    // and it restores itself
    await expect(page.locator('.hero-kicker')).toContainText('THE ALETHEIA INSTITUTE', { timeout: 5000 });
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'hamburger exists only under 820px');

  test('hamburger opens the menu, links navigate, Escape closes', async ({ page }) => {
    await gotoSettled(page);
    const toggle = page.locator('#nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mobile-menu a[href="#contact"]').click();
    await expect(page.locator('#mobile-menu')).not.toBeVisible();
    await expect(page.locator('#contact')).toBeInViewport();
  });
});

test.describe('vitals', () => {
  test('external requests measure ZERO, live, on the page itself', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#vitals').scrollIntoViewIfNeeded();
    await expect(page.locator('#v-ext')).toHaveText('0', { timeout: 8000 });
    await expect(page.locator('#v-weight')).toContainText('KB', { timeout: 8000 });
  });
});

test.describe('anchors', () => {
  test('nav link scrolls to section and hands it focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav links');
    await gotoSettled(page);
    await page.locator('.nav-links a[href="#method"]').click();
    await page.waitForTimeout(1800);
    await expect(page.locator('#method')).toBeInViewport();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('method');
  });
});
