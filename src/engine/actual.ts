// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Hour } from './types';

/**
 * Real air temperature across the window. Feels-like is a model people
 * distrust when it disagrees with other apps, so it never stands alone (US-069).
 */
export function actualRange(hours: Hour[]): { min: number; max: number } | null {
  if (!hours.length) return null;
  const temps = hours.map((h) => h.temp);
  return { min: Math.min(...temps), max: Math.max(...temps) };
}
