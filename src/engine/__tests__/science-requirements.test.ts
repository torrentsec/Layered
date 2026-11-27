// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { advise, colderThan, mergedScience } from '../advise';
import type { WindowStats } from '../extras';
import { insulationPoints, layerPlan, requirementsFor, type RequirementsInput } from '../requirements';
import { scienceVerdict, wetState, type ScienceInput } from '../science/advice';
import { bandForClo, clothingTarget } from '../science/target';
import type { Weather } from '../science/types';
import type { Advice } from '../types';
import { day } from './fixtures';

const STILL: WindowStats = { maxProb: 0, totalPrecip: 0, maxGust: 0, maxWind: 0, maxUv: 0, snow: false, dark: false, warming: 0 };
const weather = (over: Partial<Weather> = {}): Weather => ({ ta: 2, rh: 80, wind10: 4, tmrt: 2, radiation: 'forecast', ...over });
const sci = (over: Partial<Weather> = {}, bias = 0): ScienceInput => ({ weather: [weather(over)], exposureHours: 0.5, bias });
const input = (science?: ScienceInput): RequirementsInput => ({ effective: 20, band: 'light', stats: STILL, extras: [], activity: 'walking', ...(science ? { science } : {}) });

describe('requirementsFor with the science engine (S7c)', () => {
  it('takes the band from the clothing target, not from effective', () => {
    const s = sci();
    const target = clothingTarget({ hours: s.weather, activity: 'walking', exposureHours: 0.5, bias: 0 });
    const r = requirementsFor(input(s));
    expect(r.band).toBe(bandForClo(target.icl));
    expect(r.band).not.toBe('light');
    expect(r.clo).toEqual(target);
  });

  it('hands the matcher the band plan and its points', () => {
    const r = requirementsFor(input(sci()));
    expect(r.layers).toEqual(layerPlan(r.band));
    expect(r.insulation).toBe(insulationPoints(r.layers));
  });

  it('passes the bias through to the target', () => {
    expect(requirementsFor(input(sci({}, 0.3)))!.clo!.icl).toBeCloseTo(requirementsFor(input(sci()))!.clo!.icl + 0.3, 6);
  });

  it('leaves the band engine alone without a science input', () => {
    const r = requirementsFor(input());
    expect(r.band).toBe('light');
    expect(r.clo).toBeUndefined();
  });

  it('hedges a target near a band edge, wider when radiation is estimated', () => {
    // Find a bias that puts the target just outside the narrow hedge of the next edge.
    const base = clothingTarget({ hours: [weather()], activity: 'walking', exposureHours: 0.5, bias: 0 }).icl;
    const edge = 1.25;
    const bias = edge - 0.12 - base;
    expect(scienceVerdict(sci({}, bias), 'walking').edge).toBe(false);
    expect(scienceVerdict(sci({ radiation: 'estimated' }, bias), 'walking').edge).toBe(true);
    expect(requirementsFor(input(sci({ radiation: 'estimated' }, bias))).removableWhy).toBe('edge');
  });

  it('widens the hedge when UTCI had to clamp its inputs', () => {
    const base = clothingTarget({ hours: [weather({ wind10: 20 })], activity: 'walking', exposureHours: 0.5, bias: 0 }).icl;
    const bias = 1.5 - 0.12 - base;
    expect(scienceVerdict({ weather: [weather({ wind10: 20 })], exposureHours: 0.5, bias }, 'walking').edge).toBe(true);
  });
});

describe('wetState', () => {
  it('follows the rain extras thresholds', () => {
    expect(wetState({ maxProb: 0, totalPrecip: 0 })).toBe('dry');
    expect(wetState({ maxProb: 30, totalPrecip: 0 })).toBe('showers');
    expect(wetState({ maxProb: 60, totalPrecip: 0 })).toBe('rain');
    expect(wetState({ maxProb: 10, totalPrecip: 1 })).toBe('rain');
  });
});

describe('advise with the science engine', () => {
  const place = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
  const hours = day(2, () => ({ temp: 3, feels: 0, wind: 20, rh: 85, cloud: 100 }));

  it('names the clo target in the rules and fills "Why this?"', () => {
    const a = advise({ hours, activity: 'walking', science: { place, bias: 0, biasCount: 4, exposureHours: 0.5 } })!;
    expect(a.band).toBe(a.requirements?.band);
    expect(a.why.rules[0]).toMatch(/^Needs about \d\.\d clo/);
    expect(a.science).toMatchObject({ exposureMinutes: 30, biasCount: 4, ta: 3 });
    expect(a.science!.feels.min).toBeLessThanOrEqual(a.science!.feels.max);
  });

  it('defaults the exposure to the window length', () => {
    expect(advise({ hours, activity: 'walking', science: { place, bias: 0, biasCount: 0 } })!.science!.exposureMinutes).toBe(120);
  });

  it('gives the same advice as before without the flag', () => {
    const a = advise({ hours, activity: 'walking' })!;
    expect(a.science).toBeUndefined();
    expect(a.why.rules[0]).toMatch(/^Effective/);
  });
});

describe('colderThan and mergedScience', () => {
  const adv = (effective: number, icl?: number, feels?: { min: number; max: number }) =>
    ({ effective, ...(icl !== undefined ? { requirements: { clo: { icl } } } : {}), ...(feels ? { science: { feels } } : {}) }) as unknown as Advice;

  it('compares clo targets when both have one, effective otherwise', () => {
    expect(colderThan(adv(10, 1.2), adv(5, 1.0))).toBe(true);
    expect(colderThan(adv(5), adv(10))).toBe(true);
    expect(colderThan(adv(10), adv(5))).toBe(false);
  });

  it('spans every leg’s UTCI range', () => {
    const cold = adv(0, 1.2, { min: -5, max: 0 });
    expect(mergedScience(cold, [cold, adv(5, 0.9, { min: 2, max: 8 })])!.feels).toEqual({ min: -5, max: 8 });
    expect(mergedScience(adv(0), [adv(0)])).toBeUndefined();
  });
});
