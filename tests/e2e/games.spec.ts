import { test, expect } from '@playwright/test';
import { seed } from './helpers';

test('multiple choice EN → FR: answer with a key, continue with Enter', async ({ page }) => {
  await seed(page);
  await page.goto('/#/study');
  await page.getByRole('radio', { name: 'Multiple choice' }).click();
  await page.getByRole('radio', { name: 'EN → FR' }).click();
  await page.getByRole('button', { name: /Start session/ }).click();
  await expect(page.getByText(/English → French/)).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByRole('status').getByText(/Correct|Not quite/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^(2|1) \/ 1[56]$/)).toBeVisible();
});

test('listening, typed: the right word is accepted', async ({ page }) => {
  await seed(page);
  await page.goto('/#/study');
  await page.getByRole('radio', { name: 'Listening' }).click();
  await page.getByRole('radio', { name: 'Type' }).click();
  await page.getByRole('button', { name: /Start session/ }).click();
  const word = await page.locator('[data-word]').getAttribute('data-word');
  await page.getByRole('textbox').fill(word!);
  await page.keyboard.press('Enter');
  await expect(page.getByText('✓ Correct')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('2 / 15')).toBeVisible();
});

test('listening, choose: four French options', async ({ page }) => {
  await seed(page);
  await page.goto('/#/study');
  await page.getByRole('radio', { name: 'Listening' }).click();
  await page.getByRole('button', { name: /Start session/ }).click();
  await expect(page.getByText('What did you hear?')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Answers' }).getByRole('button')).toHaveCount(4);
  await page.getByRole('button', { name: 'Type it instead' }).click();
  await expect(page.getByText('Type what you hear')).toBeVisible();
});
