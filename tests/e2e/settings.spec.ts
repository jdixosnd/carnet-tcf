import { test, expect } from '@playwright/test';
import { seed } from './helpers';

test('backup code: copy, erase, paste back', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await seed(page, { settings: { onboarded: true }, cards: { voir: { b: 3, d: 99999, r: 2, w: 0, f: 1, l: 1 } }, hist: {} });
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Copy backup code' }).click();
  await expect(page.getByText('Backup code copied')).toBeVisible();
  const code = await page.evaluate(() => navigator.clipboard.readText());

  await page.getByRole('button', { name: 'Erase…' }).click();
  await page.getByRole('textbox', { name: /type erase/i }).fill('erase');
  await page.getByRole('button', { name: 'Erase all progress' }).click();
  await expect(page.getByText('Progress erased')).toBeVisible();
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByText('Familiar · box 3–4').locator('..')).toContainText('0');

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Paste code' }).click();
  await page.getByRole('textbox', { name: 'Backup code' }).fill('not a code');
  await page.getByRole('button', { name: 'Check code' }).click();
  await expect(page.getByText("That code isn't a valid Carnet backup")).toBeVisible();
  await page.getByRole('textbox', { name: 'Backup code' }).fill(code);
  await page.getByRole('button', { name: 'Check code' }).click();
  await page.getByRole('button', { name: 'Replace my progress' }).click();
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByText('Familiar · box 3–4').locator('..')).toContainText('1');
});

test('theme: dark, and system follows the OS', async ({ page }) => {
  await seed(page);
  await page.goto('/#/settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'System' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('settings persist across a reload', async ({ page }) => {
  await seed(page);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'More: New words per day' }).click();
  await expect(page.getByRole('group', { name: 'New words per day' })).toContainText('20');
  await page.reload();
  await expect(page.getByRole('group', { name: 'New words per day' })).toContainText('20');
});
