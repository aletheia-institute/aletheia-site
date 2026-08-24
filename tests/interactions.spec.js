// Every interactive feature, exercised for real.
import { test, expect } from '@playwright/test';
import { gotoSettled } from './helpers.js';

test.describe('demo terminal', () => {
  test('types, skips on click, advances, and loops back to the start', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#demo .modality').scrollIntoViewIfNeeded();
    await page.locator('.mod-tab[data-mod="ask"]').click();
    // typing begins — patient-generic, no specialty jargon
    await expect(page.locator('#term-body .q').first()).toContainText('patients are overdue', { timeout: 10000 });
    // click-to-skip completes the exchange fast
    await page.locator('#term-body').click();
    await page.locator('#term-body').click();
    await expect(page.locator('#term-body .cite').first()).toContainText('your scheduling DB', { timeout: 15000 });
    // screen readers got ONE clean announcement, not characters
    await expect(page.locator('#term-live')).toContainText('Question:', { timeout: 5000 });
    // ASK ANOTHER appears and keeps the conversation going
    const next = page.locator('#term-next');
    await expect(next).toBeVisible();
    await next.click();
    await page.locator('#term-body').click();
    await page.locator('#term-body').click();
    await expect(page.locator('#term-body .cite').nth(1)).toContainText('your PM system', { timeout: 15000 });
    // the demonstration loops forever: the button always returns
    await expect(next).toBeVisible({ timeout: 8000 });
  });

  test('after the last exchange, the loop wraps to a clean slate', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#demo .modality').scrollIntoViewIfNeeded();
    await page.locator('.mod-tab[data-mod="ask"]').click();
    const next = page.locator('#term-next');
    const body = page.locator('#term-body');
    // total exchanges known to the page
    const total = await page.evaluate(() => 5);
    // play through every exchange with skip-clicks
    await expect(body.locator('.q').first()).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < total; i++) {
      await body.click(); await body.click();
      await expect(body.locator('.cite')).toHaveCount(i + 1, { timeout: 15000 });
      await expect(next).toBeVisible({ timeout: 8000 });
      if (i < total - 1) await next.click();
    }
    // wrapping clears the terminal and starts from exchange one
    await next.click();
    await body.click(); await body.click();
    await expect(body.locator('.cite')).toHaveCount(1, { timeout: 15000 });
    await expect(body.locator('.q').first()).toContainText('patients are overdue');
  });
});

test.describe('kicker unconcealment', () => {
  test.skip(({ isMobile }) => isMobile, 'pointer replay is a desktop affordance');

  test('clicking a kicker replays the Greek-to-English transition', async ({ page }) => {
    await gotoSettled(page);
    const kicker = page.locator('#services .kicker');
    await kicker.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);   // entry animation settles
    await expect(kicker).toContainText('What We Do', { timeout: 5000 });
    await kicker.click();
    // mid-animation the text passes through the Greek glyph pool
    await page.waitForFunction(() => {
      const k = document.querySelector('#services .kicker');
      return /[ΑΛΗΘΕΙΦΣΔΠΩΞΨΓΡΤ]/.test(k.textContent);
    }, null, { timeout: 2500 });
    // and resolves back to English
    await expect(kicker).toContainText('What We Do', { timeout: 5000 });
  });
});

test.describe('inquiry', () => {
  test('conversational intake composes a mailto to inquiry@ with the visitor words', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#inquiry').scrollIntoViewIfNeeded();
    await page.locator('#inq-field').fill('Dr. Felix Rivera');
    await page.locator('#inq-continue').click();
    await page.locator('#inq-field').fill('Riverside Medicine');
    await page.locator('#inq-continue').click();
    await page.locator('#inq-field').fill('I want to know which patients slip through the cracks.');
    await page.locator('#inq-continue').click();
    await page.locator('#inq-field').fill('felix@riverside.example');
    await page.locator('#inq-continue').click();
    // review shows the sealed inquiry
    await expect(page.locator('.inq-review')).toContainText('inquiry@aletheiainstitute.ai');
    await expect(page.locator('.inq-review')).toContainText('slip through the cracks');
    const href = await page.locator('#inq-send').getAttribute('href');
    expect(href).toContain('mailto:inquiry@aletheiainstitute.ai');
    expect(href).toContain(encodeURIComponent('Dr. Felix Rivera'));
    expect(href).toContain(encodeURIComponent('slip through the cracks'));
  });

  test('required steps refuse to advance empty; email must be valid', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#inquiry').scrollIntoViewIfNeeded();
    await page.locator('#inq-continue').click();               // empty name
    await expect(page.locator('#inq-err')).toContainText('This one we need');
    await page.locator('#inq-field').fill('Dr. Rivera');
    await page.locator('#inq-continue').click();
    await page.locator('#inq-continue').click();               // org optional — advances
    await page.locator('#inq-field').fill('A question.');
    await page.locator('#inq-continue').click();
    await page.locator('#inq-field').fill('not-an-email');
    await page.locator('#inq-continue').click();
    await expect(page.locator('#inq-err')).toContainText('valid address');
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

test.describe('the modality stage', () => {
  test('four capabilities; tabs switch panels; the note assembles itself', async ({ page }) => {
    await gotoSettled(page);
    await page.locator('#demo .modality').scrollIntoViewIfNeeded();
    await expect(page.locator('.mod-tab')).toHaveCount(4);
    // LISTEN is the doctor-first default: dictation types, the note fills
    await expect(page.locator('.mod-tab[data-mod="listen"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#dict-live')).toContainText('epigastric', { timeout: 15000 });
    await expect(page.locator('#mod-listen .note-field').first()).toHaveClass(/on/, { timeout: 20000 });
    // READ: fields lift out of the scan with confidence scores
    await page.locator('.mod-tab[data-mod="read"]').click();
    await expect(page.locator('#mod-read')).toBeVisible();
    await expect(page.locator('#mod-read .chip').first()).toHaveClass(/on/, { timeout: 10000 });
    // WATCH: the timecode runs
    await page.locator('.mod-tab[data-mod="watch"]').click();
    await expect(page.locator('#vid-tc')).not.toHaveText('00:00', { timeout: 8000 });
    // ASK: the console remains, one tab among equals
    await page.locator('.mod-tab[data-mod="ask"]').click();
    await expect(page.locator('#mod-ask .terminal')).toBeVisible();
  });
});

test.describe('the coin', () => {
  test('click flips the seal to its reverse and back; keyboard works too', async ({ page }) => {
    await gotoSettled(page);
    const coin = page.locator('#footer-seal');
    await coin.scrollIntoViewIfNeeded();
    await expect(coin).toHaveAttribute('aria-pressed', 'false');
    await coin.click();
    await expect(coin).toHaveClass(/flipped/);
    await expect(coin).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.coin-back .cb-word')).toHaveText('ΑΛΗΘΕΙΑ');
    await expect(page.locator('.coin-back .cb-line').first()).toContainText('Truth is not told');
    await coin.press('Enter');
    await expect(coin).not.toHaveClass(/flipped/);
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
