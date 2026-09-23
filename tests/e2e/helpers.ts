import type { Page } from '@playwright/test';

/** Seeds the browser repo once per test (before the app loads). */
export async function seed(page: Page, data: object = { settings: { onboarded: true } }) {
  await page.addInitScript(s => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('carnet-desktop-dev', s);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(data));
}
