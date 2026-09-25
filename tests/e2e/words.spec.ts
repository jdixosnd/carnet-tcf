import { test, expect } from '@playwright/test';
import { seed } from './helpers';

test('filter by test and level, and the filters come back after leaving', async ({ page }) => {
  await seed(page);
  await page.goto('/#/study');
  await expect(page.getByText('cards waiting today')).toBeVisible();
  await page.keyboard.press('Control+2');
  await expect(page.getByRole('heading', { name: 'Words' })).toBeVisible();
  await expect(page.getByText('4,842 words')).toBeVisible();

  await page.getByRole('button', { name: 'Tests: All tests' }).click();
  await page.getByRole('group', { name: 'Tests' }).getByRole('button', { name: '12', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('group', { name: 'Levels' }).getByRole('button', { name: 'B1' }).click();
  await page.getByRole('group', { name: 'Levels' }).getByRole('button', { name: 'B2' }).click();
  await expect(page.getByText('· Test 12 · B1, B2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tests: Test 12' })).toBeVisible();

  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Words' }).click();
  await expect(page.getByText('· Test 12 · B1, B2')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('4,842 words')).toBeVisible();
});

test('search by a heard form, open the drawer, then add the selection to today', async ({ page }) => {
  await seed(page, { settings: { onboarded: true, newPerDay: 0 } });
  await page.goto('/#/words');
  await expect(page.getByText('4,842 words')).toBeVisible();
  await page.keyboard.press('/');
  await page.keyboard.type('allons');
  await expect(page.getByText('match ‘allons’')).toBeVisible();
  await page.getByRole('row', { name: /aller/ }).first().click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('aller');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('checkbox', { name: 'Select aller' }).click();
  await expect(page.getByRole('region', { name: 'Selection' })).toContainText('1 selected');
  await page.getByRole('button', { name: "Add to today's reviews" }).click();
  await expect(page.getByText('1 word added to today')).toBeVisible();
  await expect(page.getByText('1 review due today')).toBeVisible();
});

test('no results, then the A–Z rail jumps to a letter', async ({ page }) => {
  await seed(page);
  await page.goto('/#/words');
  await page.getByLabel('Filter words or meanings').fill('zzqqx');
  await expect(page.getByText('No words match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).last().click();
  await page.getByRole('navigation', { name: 'Jump to letter' }).getByRole('button', { name: 'P' }).click();
  await expect(page.getByRole('navigation', { name: 'Jump to letter' }).getByRole('button', { name: 'P' })).toHaveAttribute('aria-current', 'true');
});
