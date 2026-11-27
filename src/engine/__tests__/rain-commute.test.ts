// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { chanceNote, rainSummary, wetFrom } from '../rain';
import { adviseCommute } from '../commute';
import { legWindow, selectWindow } from '../window';
import { fmt12 } from '../time';
import { day } from './fixtures';

const wetAt = (wet: number[], start = 8, count = 14) =>
  day(count, (i) => (wet.includes(i + start) ? { precipProb: 80, precip: 1 } : {}), start);

describe('rain timing', () => {
  it('dry all day', () => expect(rainSummary(wetAt([]))).toBe('Dry all day'));
  it('dry for a short range', () => expect(rainSummary(wetAt([], 8, 4))).toBe('Dry until 11:00'));
  it('dry until, then rain', () =>
    expect(rainSummary(wetAt([15, 16, 17, 18, 19, 20, 21]))).toBe('Dry until about 15:00, then rain (80% chance)'));
  it('short bursts are showers from around a time', () =>
    expect(rainSummary(wetAt([19, 20, 21]))).toBe('Showers from around 19:00 (80% chance)'));
  it('rain clearing', () => expect(rainSummary(wetAt([8, 9]))).toBe('Showers clearing by about 10:00'));
  it('rain easing and returning', () =>
    expect(rainSummary(wetAt([8, 9, 17]))).toBe('Showers easing by about 10:00, back from around 17:00 (80% chance)'));
  it('a single spell', () =>
    expect(rainSummary(wetAt([12, 13]))).toBe('Showers from around 12:00 to 14:00, otherwise dry (80% chance)'));
  it('on and off', () => expect(rainSummary(wetAt([10, 14, 18]))).toBe('On and off showers from around 10:00 (80% chance)'));
  it('wet throughout', () =>
    expect(rainSummary(wetAt([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]))).toBe('Rain all day (80% chance)'));
  it('wet for a short range', () => expect(rainSummary(wetAt([8, 9, 10, 11], 8, 4))).toBe('Rain until 11:00 (80% chance)'));
  it('uses shower codes', () => {
    const h = day(14, (i) => (i >= 6 ? { precipProb: 70, precip: 0.5, code: 80 } : {}));
    expect(rainSummary(h)).toBe('Showers from around 14:00 (70% chance)');
  });
  it('drizzle', () => {
    const h = day(14, (i) => (i >= 6 ? { precipProb: 50, precip: 0.1, code: 51 } : {}));
    expect(rainSummary(h)).toBe('Dry until about 14:00, then drizzle (50% chance)');
  });
  it('snow', () => {
    const h = day(14, (i) => (i >= 6 ? { snow: 1, code: 73 } : {}));
    expect(rainSummary(h)).toBe('Dry until about 14:00, then snow');
  });
  it('honours the 12-hour clock', () =>
    expect(rainSummary(wetAt([15, 16, 17, 18, 19, 20, 21]), fmt12)).toBe('Dry until about 3pm, then rain (80% chance)'));
  it('honours the 12-hour clock for spells', () =>
    expect(rainSummary(wetAt([12, 13]), fmt12)).toBe('Showers from around 12pm to 2pm, otherwise dry (80% chance)'));
  it('empty', () => expect(rainSummary([])).toBe(''));
});

describe('rain chance', () => {
  const withProbs = (probs: number[], precip = 1) => day(probs.length, (i) => ({ precipProb: probs[i], precip }));
  it('uses the peak of the wet hours', () => expect(chanceNote(withProbs([45, 72.4, 60]))).toBe(' (72% chance)'));
  it('starts at 40%', () => expect(chanceNote(withProbs([40], 0))).toBe(' (40% chance)'));
  it('is left off when rain is near certain', () => expect(chanceNote(withProbs([60, 95]))).toBe(''));
  it('is left off when only the measured amount says wet', () => expect(chanceNote(withProbs([20, 30]))).toBe(''));
  it('is left off when dry', () => expect(chanceNote(day(4))).toBe(''));
  it('ignores the chance of dry hours', () => {
    const h = day(3, (i) => (i === 0 ? { precipProb: 35 } : { precipProb: 50, precip: 0.2 }));
    expect(chanceNote(h)).toBe(' (50% chance)');
  });
});

describe('wet from', () => {
  it('words the first wet hour approximately', () => expect(wetFrom(wetAt([15, 16, 17, 18, 19]))).toBe('rain from around 15:00'));
  it('honours the 12-hour clock', () => expect(wetFrom(wetAt([15]), fmt12)).toBe('showers from around 3pm'));
  it('is undefined when dry', () => expect(wetFrom(wetAt([]))).toBeUndefined());
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
    expect(c.notes).toContain('Umbrella for the way home — showers from around 17:00');
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
