// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise, mergedScience } from '../advise';
import { adviseLegs, routineLegs, type Leg } from '../routines';
import type { Advice } from '../types';
import { day } from './fixtures';

const place = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
const science = { place, bias: 0, biasCount: 0 };
const cold = (feels: number, temp: number) => () => ({ temp, feels, wind: 15, rh: 85, cloud: 100 });
const hours = [...day(4, cold(-1, 2), 6), ...day(4, cold(6, 9), 10), ...day(3, cold(3, 6), 17)];
const dogWalk = { id: 'dog', name: 'Dog walk', time: '07:45', hours: 0.5, days: [0, 1, 2, 3, 4, 5, 6], activity: 'walking' as const };

describe('routine legs dress for their own length (#77)', () => {
  it('gives a half-hour routine across an hour boundary half an hour outside', () => {
    const [leg] = routineLegs(hours, '2026-11-26', [dogWalk]);
    expect(leg.hours).toHaveLength(2);
    expect(leg.exposureHours).toBe(0.5);
  });

  it('passes that length to the science engine, not the hours it touches', () => {
    const legs = routineLegs(hours, '2026-11-26', [dogWalk]);
    const a = adviseLegs({ science }, legs)!;
    expect(a.legs[0].advice.science!.exposureMinutes).toBe(30);
    expect(a.legs[0].advice.requirements!.clo!.exposureHours).toBe(0.5);
  });

  it('keeps the day leg on the chosen duration', () => {
    const dayLeg: Leg = { id: 'day', label: 'The day', phrase: 'the day', activity: 'walking', hours: hours.slice(4, 8), exposureHours: 2 };
    expect(adviseLegs({ science }, [dayLeg])!.legs[0].advice.science!.exposureMinutes).toBe(120);
  });

  it('falls back to the leg’s hours when no length is given', () => {
    const out: Leg = { id: 'out', label: 'Out', phrase: 'the way there', activity: 'walking', hours: hours.slice(1, 3) };
    expect(adviseLegs({ science }, [out])!.legs[0].advice.science!.exposureMinutes).toBe(120);
  });

  it('leaves the band engine as it was', () => {
    const [leg] = routineLegs(hours, '2026-11-26', [dogWalk]);
    const plain: Leg = { ...leg, exposureHours: undefined };
    expect(adviseLegs({}, [leg])!.advice).toEqual(adviseLegs({}, [plain])!.advice);
    expect(adviseLegs({}, [leg])!.advice.science).toBeUndefined();
  });
});

describe('feels-like merged across legs (#77)', () => {
  const out: Leg = { id: 'out', label: 'Out', phrase: 'the way there', activity: 'walking', hours: hours.slice(1, 2), exposureHours: 1 };
  const back: Leg = { id: 'back', label: 'Back', phrase: 'the way home', activity: 'walking', hours: hours.slice(8, 9), exposureHours: 1 };
  const lunch: Leg = { id: 'lunch', label: 'Lunch walk', phrase: 'the lunch walk', activity: 'walking', hours: hours.slice(6, 7), exposureHours: 0.5 };

  it('spans every leg’s UTCI so Today reads one range', () => {
    const a = adviseLegs({ science }, [out, lunch, back])!;
    const each = a.legs.map((l) => l.advice.science!.feels);
    expect(a.advice.science!.feels).toEqual({ min: Math.min(...each.map((f) => f.min)), max: Math.max(...each.map((f) => f.max)) });
    expect(a.advice.science!.feels.min).toBeLessThan(a.advice.science!.feels.max);
  });

  it('leaves out a leg with no usable UTCI instead of dropping the whole range', () => {
    const good = advise({ activity: 'walking', hours: out.hours, science })!;
    const broken: Advice = { ...good, science: { ...good.science!, feels: { min: Number.NaN, max: Number.NaN } } };
    expect(mergedScience(good, [good, broken])!.feels).toEqual(good.science!.feels);
    expect(mergedScience(broken, [broken])!.feels.min).toBeNaN();
  });
});
