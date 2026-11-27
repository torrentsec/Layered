// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { wetFrom } from './rain';
import { fmt24, type TimeFormatter } from './time';
import type { Advice, BandId } from './types';

const SHORT: Record<BandId, string> = {
  tshirt: 'T-shirt',
  light: 'T-shirt',
  two: 'Two layers',
  jacket: 'Jacket',
  coat: 'Coat',
  bundle: 'Heavy coat',
};

const PRIORITY = ['hood', 'waterproof', 'umbrella', 'gloves', 'hat', 'sunscreen', 'boots'] as const;

/**
 * e.g. "Coat + umbrella today · showers from around 16:00". Short enough for a lock
 * screen. The evening heads-up (US-061) says "tomorrow" instead.
 */
export function notificationText(advice: Advice, dayHours = advice.hours, fmt: TimeFormatter = fmt24, day: 'today' | 'tomorrow' = 'today'): string {
  const ids = new Set(advice.extras.map((e) => e.id));
  const bits = [SHORT[advice.band]];
  for (const id of PRIORITY) {
    if (!ids.has(id)) continue;
    // A waterproof makes an umbrella redundant on a lock screen.
    if (id === 'umbrella' && (ids.has('waterproof') || ids.has('hood'))) continue;
    bits.push(advice.extras.find((e) => e.id === id)!.label.toLowerCase());
    if (bits.length === 3) break;
  }
  return `${bits.join(' + ')} ${day} · ${wetFrom(dayHours, fmt) ?? 'dry'}`;
}
