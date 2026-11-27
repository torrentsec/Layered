// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { comfortTime, MIN_EFFECTIVE_CLO } from '../comfort-time';
import { dle, lightestIclFor } from '../ireq';
import { metabolicRate } from '../metabolic';
import { ireqParamsFor } from '../target';
import type { Weather } from '../types';

const cold: Weather = { ta: 0, rh: 80, wind10: 4.4, tmrt: 0, radiation: 'forecast' };
const colder: Weather = { ...cold, ta: -4, tmrt: -4 };
const walking = metabolicRate('walking');
const cycling = metabolicRate('cycling');

describe('comfortTime', () => {
  it('is the DLE of the same ISO 11079 inputs the clothing target uses', () => {
    const t = comfortTime({ hours: [cold], metabolic: walking, worn: 1.2, bias: 0 })!;
    const ref = dle({ ...ireqParamsFor(cold, walking), icl: 1.2 });
    expect(t.warm).toBe(ref.neutral);
    expect(t.bearable).toBe(ref.min);
    expect(t.bearable).toBeGreaterThanOrEqual(t.warm);
  });

  it('lasts longer in more clothes', () => {
    const light = comfortTime({ hours: [cold], metabolic: walking, worn: 0.9, bias: 0 })!;
    const heavy = comfortTime({ hours: [cold], metabolic: walking, worn: 1.5, bias: 0 })!;
    expect(heavy.warm).toBeGreaterThan(light.warm);
  });

  it('runs out sooner for someone who runs cold', () => {
    const avg = comfortTime({ hours: [cold], metabolic: walking, worn: 1.2, bias: 0 })!;
    const coldPerson = comfortTime({ hours: [cold], metabolic: walking, worn: 1.2, bias: 0.2 })!;
    expect(coldPerson.worn).toBeCloseTo(1.0);
    expect(coldPerson.warm).toBeLessThan(avg.warm);
    expect(comfortTime({ hours: [cold], metabolic: walking, worn: 0.2, bias: 0.5 })!.worn).toBe(MIN_EFFECTIVE_CLO);
  });

  it('answers for the hour that runs out first', () => {
    const t = comfortTime({ hours: [cold, colder, cold], metabolic: walking, worn: 1.2, bias: 0 })!;
    expect(t.hour).toBe(1);
  });

  it('never gives a rider longer than a walker in the same clothes', () => {
    const ride = comfortTime({ hours: [cold], metabolic: cycling, worn: 1.2, bias: 0 })!;
    const walk = comfortTime({ hours: [cold], metabolic: walking, worn: 1.2, bias: 0 })!;
    expect(ride.warm).toBeLessThanOrEqual(walk.warm);
  });

  it('covers the time outside when worn at the clothing target', () => {
    // The target is the lightest outfit whose neutral DLE covers the exposure, so wearing it must cover it.
    const icl = lightestIclFor(ireqParamsFor(cold, walking), 0.5);
    expect(comfortTime({ hours: [cold], metabolic: walking, worn: icl, bias: 0 })!.warm).toBeGreaterThanOrEqual(0.5 - 1e-6);
  });

  it('has nothing to say without hours or a number', () => {
    expect(comfortTime({ hours: [], metabolic: walking, worn: 1.2, bias: 0 })).toBeUndefined();
    expect(comfortTime({ hours: [cold], metabolic: walking, worn: NaN, bias: 0 })).toBeUndefined();
  });
});
