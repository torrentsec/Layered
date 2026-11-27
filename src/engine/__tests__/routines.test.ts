// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import { adviseCommute } from '../commute';
import {
  ROUTINE_HOURS,
  ROUTINE_MAX_HOURS,
  ROUTINE_MIN_HOURS,
  ROUTINE_PRESETS,
  adviseLegs,
  clampRoutineHours,
  daysLabel,
  lengthLabel,
  routineHours,
  routineLegs,
  routinePhrase,
  routinesOn,
  type Leg,
} from '../routines';
import { fmt12 } from '../time';
import { day } from './fixtures';

const leg = (id: string, hours: Leg['hours'], over: Partial<Leg> = {}): Leg => ({ id, label: id, phrase: `the ${id}`, activity: 'walking', hours, ...over });

describe('routine presets (US-065)', () => {
  it('offers the school run and the dog walk', () => {
    expect(ROUTINE_PRESETS).toEqual([
      { name: 'School run', time: '08:15', hours: 0.5, days: [1, 2, 3, 4, 5], activity: 'walking' },
      { name: 'Dog walk', time: '07:00', hours: 0.5, days: [0, 1, 2, 3, 4, 5, 6], activity: 'walking' },
    ]);
  });

  it('runs from half an hour to three in half-hour steps', () => {
    expect(ROUTINE_HOURS).toEqual([0.5, 1, 1.5, 2, 2.5, 3]);
    expect([ROUTINE_MIN_HOURS, ROUTINE_MAX_HOURS]).toEqual([0.5, 3]);
  });

  it.each([[0, 0.5], [0.4, 0.5], [0.5, 0.5], [1.2, 1], [1.3, 1.5], [3, 3], [3.5, 3], [Number.NaN, 0.5]])('clamps %s h to %s h', (h, out) => {
    expect(clampRoutineHours(h)).toBe(out);
  });

  it('labels lengths', () => {
    expect(ROUTINE_HOURS.map(lengthLabel)).toEqual(['30 min', '1 h', '1.5 h', '2 h', '2.5 h', '3 h']);
  });

  it.each([
    [[0, 1, 2, 3, 4, 5, 6], 'Every day'],
    [[5, 4, 3, 2, 1], 'Weekdays'],
    [[6, 0], 'Weekends'],
    [[], 'No days'],
    [[0, 3, 1], 'Mon, Wed, Sun'],
    [[1, 2, 3, 4], 'Mon, Tue, Wed, Thu'],
  ] as [number[], string][])('labels %j as %s', (days, label) => expect(daysLabel(days)).toBe(label));

  it.each([
    ['Dog walk', 'the dog walk'],
    ['School run', 'the school run'],
    ['gym', 'the gym'],
    ['Sam’s football', 'Sam’s football'],
    ["Sam's swim", "Sam's swim"],
    ['  ', 'the routine'],
  ])('phrases %s as %s', (name, phrase) => expect(routinePhrase(name)).toBe(phrase));
});

describe('routines on a day', () => {
  const r = (id: string, time: string, days: number[]) => ({ id, name: id, time, hours: 0.5, days, activity: 'walking' as const });
  // 2026-11-26 is a Thursday.
  it('keeps only routines scheduled that weekday, earliest first', () => {
    const list = [r('late', '18:00', [4]), r('weekend', '09:00', [0, 6]), r('early', '07:00', [4])];
    expect(routinesOn(list, '2026-11-26').map((x) => x.id)).toEqual(['early', 'late']);
    expect(routinesOn(list, '2026-11-28').map((x) => x.id)).toEqual(['weekend']);
  });

  const hours = day(24, () => ({}), 0);
  const times = (hs: { time: string }[]) => hs.map((h) => h.time.slice(11, 13));

  it('covers every hour the span touches', () => {
    expect(times(routineHours(hours, '2026-11-26', { time: '07:00', hours: 0.5 }))).toEqual(['07']);
    expect(times(routineHours(hours, '2026-11-26', { time: '07:45', hours: 0.5 }))).toEqual(['07', '08']);
    expect(times(routineHours(hours, '2026-11-26', { time: '08:15', hours: 3 }))).toEqual(['08', '09', '10', '11']);
    expect(times(routineHours(hours, '2026-11-26', { time: '09:00', hours: 2 }))).toEqual(['09', '10']);
  });

  it('stops at midnight rather than running into tomorrow', () => {
    const two = day(48, () => ({}), 0);
    expect(times(routineHours(two, '2026-11-26', { time: '23:30', hours: 1 }))).toEqual(['23']);
  });

  it('drops hours already gone today, and routines entirely past', () => {
    expect(times(routineHours(hours, '2026-11-26', { time: '07:45', hours: 1 }, '2026-11-26T08:20'))).toEqual(['08']);
    const legs = routineLegs(hours, '2026-11-26', [r('Dog walk', '07:00', [4]), r('School run', '08:15', [4])], '2026-11-26T08:20');
    expect(legs.map((l) => [l.label, l.phrase, l.start])).toEqual([['School run', 'the school run', '2026-11-26T08:15']]);
  });

  it('carries the routine’s own activity and effort', () => {
    const run = { id: 'run', name: 'Run', time: '18:00', hours: 1, days: [4], activity: 'running' as const, effort: 'hard' as const };
    expect(routineLegs(hours, '2026-11-26', [run])[0]).toMatchObject({ activity: 'running', effort: 'hard' });
  });
});

describe('adviseLegs (US-066)', () => {
  const dog = leg('dog walk', day(1, () => ({ feels: -1 }), 7));
  const school = leg('school run', day(1, () => ({ feels: 4 }), 8));
  const restOfDay = leg('rest of the day', day(5, () => ({ feels: 9 }), 9));

  it('returns null with no hours to judge', () => {
    expect(adviseLegs({}, [])).toBeNull();
    expect(adviseLegs({}, [leg('empty', [])])).toBeNull();
  });

  it('matches plain advice for a single leg', () => {
    const one = adviseLegs({}, [restOfDay])!;
    expect(one.advice).toEqual(advise({ activity: 'walking', hours: restOfDay.hours }));
    expect(one.notes).toEqual([]);
  });

  it('dresses for the coldest leg', () => {
    const c = adviseLegs({}, [restOfDay, school, dog])!;
    expect(c.advice.effective).toBe(-1);
    expect(c.advice.layers).toEqual(advise({ activity: 'walking', hours: dog.hours })!.layers);
    expect(c.legs.map((l) => [l.leg.id, l.coldest])).toEqual([['dog walk', true], ['school run', false], ['rest of the day', false]]);
    expect(c.advice.minFeels).toBe(-1);
    expect(c.advice.maxFeels).toBe(9);
    expect(c.advice.hours.map((h) => h.time.slice(11, 13))).toEqual(['07', '08', '09', '10', '11', '12', '13']);
    expect(c.advice.why.rules[0]).toBe('Dressing for the dog walk, the coldest part of the day');
  });

  it('judges each leg with its own activity and effort', () => {
    const run = leg('run', day(1, () => ({ feels: 2 }), 7), { activity: 'running', effort: 'hard' });
    const c = adviseLegs({}, [run, school])!;
    expect(c.legs.map((l) => l.advice.effective)).toEqual([13, 4]);
    expect(c.advice.effective).toBe(4);
  });

  it('merges every leg’s extras with no repeats', () => {
    const wet = leg('wet', day(1, () => ({ feels: 9, precipProb: 50, precip: 0.4 }), 17));
    const c = adviseLegs({}, [dog, wet])!;
    const ids = c.advice.extras.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['gloves', 'hat', 'scarf', 'umbrella']));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('notes what only some legs need, with when and how cold', () => {
    const c = adviseLegs({}, [restOfDay, dog])!;
    expect(c.notes).toContain('Hat for the dog walk — feels −1° at 07:00');
    expect(c.notes).toContain('Gloves for the dog walk — feels −1° at 07:00');
    expect(c.notes).toContain('Colder on the dog walk (−1° vs 9°)');
    expect(c.advice.why.rules).toEqual(expect.arrayContaining(c.notes));
  });

  it('names every leg that needs it when it is more than one', () => {
    const c = adviseLegs({}, [dog, school, restOfDay])!;
    expect(c.notes).toContain('Gloves for the dog walk and the school run');
    expect(c.notes).toContain('Coldest on the dog walk (−1° vs 9°)');
  });

  it('times rain notes like the commute does', () => {
    const wet = leg('walk home', day(2, (i) => ({ feels: 9, precipProb: i ? 70 : 10, precip: i ? 1 : 0 }), 17));
    const dry = leg('school run', day(1, () => ({ feels: 9 }), 8));
    const c = adviseLegs({}, [wet, dry], fmt12)!;
    expect(c.notes.find((n) => n.startsWith('Umbrella'))).toBe('Umbrella for the walk home — showers from 6pm');
  });

  it('says nothing when the legs agree', () => {
    const a = leg('a', day(1, () => ({ feels: 9 }), 8));
    const b = leg('b', day(1, () => ({ feels: 10 }), 17));
    expect(adviseLegs({}, [a, b])!.notes).toEqual([]);
  });

  it('keeps the first leg on a tie', () => {
    const a = leg('a', day(1, () => ({ feels: 5 }), 8));
    const b = leg('b', day(1, () => ({ feels: 5 }), 17));
    expect(adviseLegs({}, [a, b])!.legs[0].coldest).toBe(true);
  });

  it('uses the given degree format', () => {
    const c = adviseLegs({}, [restOfDay, dog], undefined, (x) => `${Math.round((x * 9) / 5 + 32)}°F`)!;
    expect(c.notes).toContain('Hat for the dog walk — feels 30°F at 07:00');
  });

  it('agrees with the commute on two legs', () => {
    const out = day(1, () => ({ feels: 2 }), 8);
    const back = day(1, () => ({ feels: 9 }), 17);
    const c = adviseCommute({ activity: 'walking' }, out, back)!;
    const l = adviseLegs({}, [leg('out', out, { phrase: 'the way there' }), leg('back', back, { phrase: 'the way home' })])!;
    expect(l.advice.effective).toBe(c.advice.effective);
    expect(l.advice.layers).toEqual(c.advice.layers);
    expect(l.advice.extras.map((e) => e.id).sort()).toEqual(c.advice.extras.map((e) => e.id).sort());
    expect(l.notes.some((n) => n.startsWith('Gloves for the way there'))).toBe(true);
  });

  it('drops the umbrella when a hood is already in', () => {
    const windyWet = leg('ride', day(1, () => ({ feels: 9, precipProb: 80, precip: 1, gusts: 50 }), 8), { activity: 'cycling' });
    const wet = leg('walk', day(1, () => ({ feels: 9, precipProb: 80, precip: 1 }), 17));
    const ids = adviseLegs({}, [windyWet, wet])!.advice.extras.map((e) => e.id);
    expect(ids).toContain('hood');
    expect(ids).not.toContain('umbrella');
  });
});
