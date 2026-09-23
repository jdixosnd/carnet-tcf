import { test, expect } from '@playwright/test';
import { seed } from './helpers';

test('flip cards: rate three cards, end early, see the summary', async ({ page }) => {
  await seed(page);
  await page.goto('/#/study');
  await page.getByRole('button', { name: /Start session · 15 cards/ }).click();
  for (const key of ['3', '3', '2']) {
    await page.keyboard.press('Space');
    await expect(page.getByRole('group', { name: /how well/i })).toBeVisible();
    await page.keyboard.press(key);
  }
  await expect(page.getByText('4 / 15')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByText('3 of 3 remembered')).toBeVisible();
  await expect(page.getByText('Nothing missed')).toBeVisible();
  await page.getByRole('button', { name: 'Back to study' }).click();
  // 12 new words left, plus the Hard-rated new word, which is due again today.
  await expect(page.getByText('13 cards waiting today')).toBeVisible();
});

test('forgotten cards come back and show up as missed', async ({ page }) => {
  await seed(page, { settings: { onboarded: true, sessionSize: 10, newPerDay: 2 } });
  await page.goto('/#/study');
  await page.getByRole('button', { name: /Start session · 2 cards/ }).click();
  const rate = async (key: string) => {
    await page.keyboard.press('Space');
    await expect(page.getByRole('group', { name: /how well/i })).toBeVisible();
    await page.keyboard.press(key);
  };
  await rate('1');                           // forgot → comes back
  await rate('3');
  await expect(page.getByText('3 / 3')).toBeVisible();
  await expect(page.getByText('One more time')).toBeVisible();
  await rate('3');
  await expect(page.getByText('1 of 2 remembered')).toBeVisible();
  await expect(page.getByText('1 to look at again')).toBeVisible();
  await page.getByRole('button', { name: 'Practise these words' }).click();
  await expect(page.getByText('Practice', { exact: true })).toBeVisible();
});

test('the back button after a session goes to Study, not into the finished session', async ({ page }) => {
  await seed(page, { settings: { onboarded: true, newPerDay: 1 } });
  await page.goto('/#/study');
  await page.getByRole('button', { name: /Start session · 1 card/ }).click();
  await page.keyboard.press('Space');
  await expect(page.getByRole('group', { name: /how well/i })).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByText('1 of 1 remembered')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/study$/);
});
