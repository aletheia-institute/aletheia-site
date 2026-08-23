// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: {
    toHaveScreenshot: {
      // Animations are frozen in visual specs (reduced-motion), but text AA still
      // varies slightly between GPU/OS builds — tolerate whisper-level drift only.
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Chromium-emulated mobile: one browser everywhere keeps CI lean & deterministic
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' }, testIgnore: /visual\.spec\.js/ },
  ],
});
