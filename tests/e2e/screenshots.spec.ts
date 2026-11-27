// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { fileURLToPath } from 'node:url';
import { expect, RETURNING, seed, test } from './fixtures';

// Run with `SCREENSHOTS=1 npm run test:e2e` to refresh the images in the README.
const out = (name: string) => fileURLToPath(new URL(`../../docs/images/${name}.png`, import.meta.url));

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' });

test.describe('README screenshots @screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, RETURNING);
  });

  test('Today', async ({ page }) => {
    await page.goto('/#/today');
    await expect(page.getByRole('img', { name: /^Feels like/ })).toBeVisible();
    await page.screenshot({ path: out('today'), animations: 'disabled' });
  });

  test('Week', async ({ page }) => {
    await page.goto('/#/week');
    await expect(page.getByRole('heading', { name: /^Next \d+ days$/ })).toBeVisible();
    await page.screenshot({ path: out('week'), animations: 'disabled' });
  });

  test('Wardrobe', async ({ page }) => {
    await page.goto('/#/wardrobe');
    await expect(page.getByRole('region', { name: 'Wardrobe completeness' })).toBeVisible();
    await page.screenshot({ path: out('wardrobe'), animations: 'disabled' });
  });
});
