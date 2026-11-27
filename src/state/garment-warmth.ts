// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { effect } from '@preact/signals';
import { learnGarmentWarmth, sameWarmth } from '../engine/garment-learning';
import { garmentWarmth, ratings } from '../data/store';

/** Local calendar date, so decay ages feedback by the days the person lived. */
export function localToday(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * The persisted map is a cache of what the ratings say, so a reset, an import
 * or a sync that changes ratings changes it too. Recomputing on load also lets
 * decay catch up after days away.
 */
export function refreshGarmentWarmth(today: string = localToday()): void {
  const next = learnGarmentWarmth(ratings.value, today);
  if (!sameWarmth(next, garmentWarmth.peek())) garmentWarmth.value = next;
}

effect(() => refreshGarmentWarmth());
