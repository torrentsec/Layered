// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { rainSummary } from '../rain';
import { adviseCommute } from '../commute';
import { legWindow, selectWindow } from '../window';
import { fmt12 } from '../time';
import { day } from './fixtures';

const wetAt = (wet: number[], start = 8, count = 14) =>
  day(count, (i) => (wet.includes(i + start) ? { precipProb: 80, precip: 1 } : {}), start);

describe('rain timing', () => {
  it('dry all day', () => expect(rainSummary(wetAt([]))).toBe('Dry all day'));
  it('dry for a short range', () => expect(rainSummary(wetAt([], 8, 4))).toBe('Dry until 11:00'));
  it('dry until, then rain', () => expect(rainSummary(wetAt([15, 16, 17, 18, 19, 20, 21]))).toBe('Dry until 15:00, then rain'));
  it('calls short bursts showers', () => expect(rainSummary(wetAt([19, 20, 21]))).toBe('Dry until 19:00, then showers'));
  it('rain clearing', () => expect(rainSummary(wetAt([8, 9]))).toBe('Showers clearing by 10:00'));
  it('rain easing and returning', () => expect(rainSummary(wetAt([8, 9, 17]))).toBe('Showers easing by 10:00, back from 17:00'));
  it('a single spell', () => expect(rainSummary(wetAt([12, 13]))).toBe('Showers 12:00–14:00, otherwise dry'));
  it('on and off', () => expect(rainSummary(wetAt([10, 14, 18]))).toBe('Dry until 10:00, then on and off showers'));
  it('wet throughout', () => expect(rainSummary(wetAt([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]))).toBe('Rain all day'));
  it('uses shower codes', () => {
    const h = day(14, (i) => (i >= 6 ? { precipProb: 70, precip: 0.5, code: 80 } : {}));
    expect(rainSummary(h)).toBe('Dry until 14:00, then showers');
  });
  it('snow', () => {
    const h = day(14, (i) => (i >= 6 ? { snow: 1, code: 73 } : {}));
    expect(rainSummary(h)).toBe('Dry until 14:00, then snow');
  });
  it('honours the 12-hour clock', () => expect(rainSummary(wetAt([15, 16, 17, 18, 19, 20, 21]), fmt12)).toBe('Dry until 3pm, then rain'));
  it('empty', () => expect(rainSummary([])).toBe(''));
});

describe('windows', () => {
  const hours = day(24, () => ({}), 0);
  it('selects from the containing hour', () => {
    const w = selectWindow(hours, '2026-11-26T08:40', 3);
    expect(w.map((h) => h.time.slice(11, 13))).toEqual(['08', '09', '10']);
  });
  it('clamps a start before the forecast', () => {
    expect(selectWindow(hours, '2026-11-25T23:00', 2)).toHaveLength(2);
  });
  it('is empty after the forecast', () => {
    expect(selectWindow(hours, '2026-11-28T08:00', 2)).toEqual([]);
  });
  it('builds a leg from HH:MM', () => {
    expect(legWindow(hours, '2026-11-26', '17:30', 1)[0].time).toBe('2026-11-26T17:00');
  });
});

describe('commute', () => {
  const hours = day(24, (i) => ({
    feels: i < 12 ? 3 : 9,
    ...(i >= 17 && i <= 19 ? { precipProb: 70, precip: 1.2, code: 80 } : {}),
  }), 0);
  const out = legWindow(hours, '2026-11-26', '08:00', 1);
  const back = legWindow(hours, '2026-11-26', '17:30', 1);
  const c = adviseCommute({ activity: 'walking' }, out, back)!;

  it('dresses for the colder leg', () => {
    expect(c.colder).toBe('out');
    expect(c.advice.band).toBe('coat');
  });
  it('carries the other leg’s extras', () => {
    expect(c.advice.extras.map((e) => e.id)).toContain('umbrella');
  });
  it('flags differences between legs', () => {
    expect(c.notes).toContain('Umbrella for the way home — showers from 17:00');
    expect(c.notes.some((n) => n.startsWith('Colder on the way there'))).toBe(true);
  });
  it('picks the return leg when it is colder', () => {
    const r = adviseCommute({ activity: 'walking' }, back, out)!;
    expect(r.colder).toBe('back');
  });
  it('is null when a leg is missing', () => {
    expect(adviseCommute({ activity: 'walking' }, out, [])).toBeNull();
  });
});
