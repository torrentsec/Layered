// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { expect, RETURNING, seed, test } from './fixtures';

test('first run: pick a place, skip the rest, and Today gives a verdict', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Where are you?' })).toBeVisible();
  await page.getByRole('searchbox').fill('London');
  await page.getByRole('button', { name: /London/ }).click();
  await expect(page.getByRole('heading', { name: 'How do you feel the cold?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip setup' }).click();

  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
  // Science is the default: the hero is the coldest hour's UTCI, the real temperature sits beside it,
  // and "Why this?" opens with the same number.
  const hero = page.locator('.readout .feels');
  await expect(hero).toHaveText(/^Feels like -?\d+°$/);
  await expect(page.locator('.readout .feels-label')).toContainText(/actual -?\d+° to -?\d+°/);
  await expect(page.locator('main')).toContainText(/coat|jacket|jumper/i);
  const number = (await hero.textContent())!.replace('Feels like ', '');
  await page.getByRole('button', { name: 'Why this?' }).click();
  await expect(page.locator('.why-lead')).toContainText(`it will feel like ${number}`);
});

test('simple bands keep the dress-for number on the hero', async ({ page }) => {
  await seed(page, { ...RETURNING, settings: { placeId: 'p1', engine: 'bands' } });
  await page.goto('/');
  await expect(page.locator('.readout .feels')).toHaveText(/^Dress for -?\d+°$/);
  await expect(page.locator('.hourly .a')).toHaveCount(0);
});

test('the learned card resets temperature learning and keeps garment marks', async ({ page }) => {
  const mark = [{ category: 'jumper', thickness: 'medium', verdict: 'too-warm' }];
  const vote = (date: string, extra = {}) => ({ date, rating: -1, effective: 6, activity: 'walking', ...extra });
  await seed(page, {
    ...RETURNING,
    ratings: [vote('2026-11-20'), vote('2026-11-21', { corrections: mark }), vote('2026-11-22', { corrections: mark }), vote('2026-11-23'), vote('2026-11-24')],
  });
  await page.goto('/#/settings');
  const card = page.locator('.learned-card');
  await expect(card).toContainText('You feel the cold');
  await expect(card).toContainText('from 5 ratings');
  // The bands' °C row is not shown next to the card under the thermal model.
  await expect(page.getByText('Learned from your feedback')).toHaveCount(0);
  const garmentReset = page.locator('li.learned-row').getByRole('button', { name: /^Reset / });
  await expect(garmentReset).toBeVisible();

  await page.getByRole('button', { name: 'Reset temperature learning' }).click();
  await expect(card).toContainText('From your comfort settings');
  await expect(page.getByRole('button', { name: 'Reset temperature learning' })).toBeDisabled();
  await expect(garmentReset).toBeVisible();
});

test.describe('returning user', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, RETURNING);
  });

  test('Week opens a day', async ({ page }) => {
    await page.goto('/#/week');
    await expect(page.getByRole('heading', { name: /^Next \d+ days$/ })).toBeVisible();
    await page.locator('a.day-row').nth(2).click();
    await expect(page).toHaveURL(/#\/week\/2026-11-28$/);
    await expect(page.getByRole('button', { name: 'All days' })).toBeVisible();
    await expect(page.getByText('Sat 28 Nov', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sat 28 Nov' }).getByRole('heading', { level: 2 }).first()).toBeVisible();
  });

  test('Trip with one stop shows a packing list', async ({ page }) => {
    await page.goto('/#/trip');
    await page.getByRole('button', { name: 'Plan a trip' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('searchbox').fill('Lisbon');
    await sheet.getByRole('button', { name: /Lisbon/ }).click();
    await expect(sheet.getByRole('button', { name: 'Remove Lisbon' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Save' }).click();

    await expect(page).toHaveURL(/#\/trip\/.+/);
    await expect(page.getByRole('heading', { name: 'Packing list' })).toBeVisible();
    await expect(page.getByRole('checkbox').first()).toBeVisible();
  });

  test('Wardrobe sets a category', async ({ page }) => {
    await page.goto('/#/wardrobe');
    const row = page.getByRole('button', { name: /^Fleeces/ });
    await expect(row).toContainText('Not set');
    await row.click();
    await page.getByRole('button', { name: 'More medium fleeces' }).click();
    await expect(row).not.toContainText('Not set');

    await page.reload();
    await expect(page.getByRole('button', { name: /^Fleeces/ })).not.toContainText('Not set');
  });

  test('Settings switches the theme', async ({ page }) => {
    await page.goto('/#/settings');
    const theme = page.getByRole('group', { name: 'Theme' });
    await theme.getByRole('radio', { name: 'Dark' }).check();
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
    await theme.getByRole('radio', { name: 'Light' }).check();
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
  });
});
