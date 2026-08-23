// Shared test plumbing.
export async function gotoSettled(page, { skipLoader = true } = {}) {
  if (skipLoader) {
    await page.addInitScript(() => {
      try { sessionStorage.setItem('aletheia-seen', '1'); } catch (e) {}
    });
  }
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 15000 });
}

// Collect every request the page makes that leaves the origin — must stay empty.
export function trackExternalRequests(page) {
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(url);
    }
  });
  return external;
}

export function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}
