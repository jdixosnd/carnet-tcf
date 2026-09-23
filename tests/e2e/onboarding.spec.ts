import { test, expect } from '@playwright/test';

test('first run: choose a pace and start learning', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/welcome/);
  await page.getByRole('radio', { name: /25 Exam soon/ }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page).toHaveURL(/#\/study/);
  await expect(page.getByText('25 cards waiting today')).toBeVisible();
  await expect(page.getByText('new words', { exact: true })).toBeVisible();
});
