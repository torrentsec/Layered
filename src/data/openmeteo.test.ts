// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { synthDay, typicalFromArchive } from './openmeteo';

describe('typical weather', () => {
  const daily = {
    time: ['2024-12-20', '2024-12-21', '2025-12-20', '2025-12-21'],
    apparent_temperature_min: [-2, 0, 0, 2],
    apparent_temperature_max: [4, 6, 6, 8],
    temperature_2m_min: [1, 2, 3, 4],
    temperature_2m_max: [6, 7, 8, 9],
    precipitation_sum: [3, 0, 0, 0],
    wind_gusts_10m_max: [30, 30, 30, 30],
    snowfall_sum: [0, 0, 0, 0],
  };
  it('averages the same calendar date across years', () => {
    const [d20, d21] = typicalFromArchive(daily, ['2026-12-20', '2026-12-21']);
    expect(d20.date).toBe('2026-12-20');
    expect(Math.min(...d20.hours.map((h) => h.feels))).toBeCloseTo(-1 + 0.0, 0);
    expect(d20.hours[0].precipProb).toBe(50);
    expect(d21.hours[0].precipProb).toBe(0);
  });
  it('skips dates with no history', () => {
    expect(typicalFromArchive({ ...daily, time: ['2025-06-01', '', '', ''] }, ['2026-12-20'])).toEqual([]);
  });
  it('peaks mid-afternoon and cools through the evening', () => {
    const h = synthDay('2026-12-20', 0, 10, 0, 10, { prob: 0, mm: 0, gusts: 20, snow: false });
    const at = (hh: string) => h.find((x) => x.time.endsWith(`${hh}:00`))!.feels;
    expect(at('15')).toBeCloseTo(10);
    expect(at('07')).toBeLessThan(at('12'));
    expect(at('22')).toBeLessThan(at('15'));
  });
});
