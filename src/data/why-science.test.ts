// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { fmt12, fmt24 } from '../engine/time';
import type { Advice } from '../engine/types';
import { londonWhy } from './__fixtures__/science-why';
import { CLO_NOTE, IDLE_HEAT, WARMING_HEAT, feelsRange, fmtClo, scienceDetail, scienceLead } from './why-science';

const row = (rows: { label: string; value: string; sub?: string }[], label: string) => rows.find((r) => r.label === label);
const LONDON_LEAD = 'At its coldest, 08:00, it will feel like -3°: cold.';

describe('scienceLead', () => {
  it('says how it feels in plain words, with no clo', () => {
    const t = scienceLead(londonWhy(), 'c', fmt24);
    expect(t).toBe(LONDON_LEAD);
    expect(t).not.toMatch(/clo|UTCI|W\/m/);
  });

  it('uses the person’s units and clock', () => {
    const t = scienceLead(londonWhy(), 'f', fmt12);
    expect(t).toMatch(/8(:00)?\s?am/i);
    expect(t).toContain('26°');
  });

  it('explains what hard exercise, standing and riding do in the cold', () => {
    const m = (m: number, ride = 0) => londonWhy({ metabolic: { m, w: 0, walk: 1.2, ride, clampedM: false } });
    expect(scienceLead(m(WARMING_HEAT), 'c', fmt24)).toContain('need less than on a walk');
    expect(scienceLead(m(WARMING_HEAT - 1), 'c', fmt24)).toBe(LONDON_LEAD);
    expect(scienceLead(m(IDLE_HEAT), 'c', fmt24)).toContain('need more than on a walk');
    expect(scienceLead(m(IDLE_HEAT + 1), 'c', fmt24)).toBe(LONDON_LEAD);
    expect(scienceLead(m(300, 5), 'c', fmt24)).toContain('air rushing past');
  });

  it('gives heat advice on a hot day and none on a comfortable one', () => {
    const hot = londonWhy({ utci: { utci: 33, category: 'strong-heat', clamped: false, outOfRange: false } });
    expect(scienceLead(hot, 'c', fmt24)).toBe('At its coldest, 08:00, it will feel like 33°: hot. Wear as little as you can and keep out of the sun.');
    const mild = londonWhy({ utci: { utci: 15, category: 'none', clamped: false, outOfRange: false } });
    expect(scienceLead(mild, 'c', fmt24)).toBe('At its coldest, 08:00, it will feel like 15°: comfortable.');
  });

  it('never shows a number the model cannot give', () => {
    const t = scienceLead(londonWhy({ utci: { utci: NaN, category: 'extreme-heat', clamped: false, outOfRange: true } }), 'c', fmt24);
    expect(t).not.toMatch(/NaN|\d°/);
  });
});

describe('scienceDetail', () => {
  it('puts feels-like (UTCI) beside the real temperature, with the stress category', () => {
    const d = scienceDetail(londonWhy(), 'walking', 'c', fmt24);
    expect(row(d.weather, 'Feels like')).toMatchObject({ value: '-3° at 08:00' });
    expect(row(d.weather, 'Feels like')!.sub).toContain('UTCI');
    expect(row(d.weather, 'Actual temperature')!.value).toBe('3°');
    expect(row(d.weather, 'Strain on your body')!.value).toBe('Moderate cold stress');
  });

  it('mentions sun or clear sky only past 2 K', () => {
    const at = (tmrtDelta: number) => row(scienceDetail(londonWhy({ tmrtDelta }), 'walking', 'c', fmt24).weather, 'Strain on your body')!.sub;
    expect(at(2)).toBeUndefined();
    expect(at(-2)).toBeUndefined();
    expect(at(4.4)).toBe('Sun adds 4°');
    expect(at(-2.6)).toBe('Clear sky takes 3°');
  });

  it('gives clo to one decimal, explains it, and names the ratings behind the adjustment', () => {
    const d = scienceDetail(londonWhy(), 'walking', 'c', fmt24);
    expect(d.warmth).toEqual([
      { label: 'Needs about', value: '1.3 clo' },
      { label: 'This outfit gives', value: '1.4 clo' },
    ]);
    expect(CLO_NOTE).toMatch(/unit of clothing warmth.*business suit is about 1/);
    expect(row(d.you, 'Your adjustment')).toEqual({ label: 'Your adjustment', value: '+0.1 clo', sub: 'from 14 ratings' });
    expect(row(d.you, 'Walking, 30 min outside')!.value).toBe('158 W/m²');
    const none = scienceDetail(londonWhy({ biasCount: 0, target: { ...londonWhy().target, bias: 0 } }), 'walking', 'c', fmt24);
    expect(row(none.you, 'Your adjustment')).toMatchObject({ value: '±0.0 clo', sub: 'no ratings yet' });
  });

  it('mentions wind only when it takes more than 15% off', () => {
    const at = (windLoss: number) => scienceDetail(londonWhy({ outfit: { basic: 1.4, windLoss } }), 'walking', 'c', fmt24).warmthNotes;
    expect(at(0.25)).toEqual(['Wind takes 25% off this outfit’s warmth.']);
    expect(at(0.15)).toEqual([]);
  });

  it('flags estimates', () => {
    const d = scienceDetail(londonWhy({ radiation: 'estimated', target: { ...londonWhy().target, basis: 'ireq-extended' } }), 'walking', 'c', fmt24);
    expect(d.caveats).toEqual(['Outside the standard’s tested range, so this is an estimate.', 'Sunshine estimated from cloud cover.']);
    expect(scienceDetail(londonWhy(), 'walking', 'c', fmt24).caveats).toEqual([]);
  });

  it('shows the stress category instead of a number when UTCI has none', () => {
    const d = scienceDetail(londonWhy({ utci: { utci: NaN, category: 'extreme-heat', clamped: false, outOfRange: true } }), 'walking', 'c', fmt24);
    expect(row(d.weather, 'Feels like')!.value).toBe('Extreme heat stress at 08:00');
  });

  it('writes long outings in hours', () => {
    expect(scienceDetail(londonWhy({ exposureMinutes: 120 }), 'hiking', 'c', fmt24).you[0].label).toBe('Hiking, 2 h outside');
  });
});

describe('fmtClo and feelsRange', () => {
  it('rounds clo to one decimal', () => {
    expect(fmtClo(1.25)).toBe('1.3 clo');
    expect(fmtClo(0.5)).toBe('0.5 clo');
  });

  it('reads UTCI with the science engine and apparent temperature without', () => {
    const band = { minFeels: 1, maxFeels: 4 } as Advice;
    expect(feelsRange(band)).toEqual({ min: 1, max: 4 });
    expect(feelsRange({ ...band, science: londonWhy() })).toEqual({ min: -3.2, max: 0.6 });
  });
});
