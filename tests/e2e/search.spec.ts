import { test, expect } from '@playwright/test';
import { seed } from './helpers';

test('Ctrl+K search by a heard form, then add to today', async ({ page }) => {
  await seed(page, { settings: { onboarded: true, newPerDay: 0 } });
  await page.goto('/#/study');
  await expect(page.getByText('All done for today')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('allons');
  await expect(page.getByRole('option').first()).toContainText('matched “allons”');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('aller');
  await page.getByRole('button', { name: "Add to today's reviews" }).click();
  await page.getByRole('link', { name: 'Study' }).click();
  await expect(page.getByText('1 card waiting today')).toBeVisible();
});

test('English search and no-results state', async ({ page }) => {
  await seed(page);
  await page.goto('/#/search');
  await page.getByRole('searchbox').fill('to wait');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('attendre');
  await page.getByRole('searchbox').fill('zzqqx');
  await expect(page.getByText('No word matches “zzqqx”')).toBeVisible();
});
