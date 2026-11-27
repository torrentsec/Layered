// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { day } from '../engine/__tests__/fixtures';
import type { Advice, LayerAdvice } from '../engine/types';
import { londonWhy } from './__fixtures__/science-why';
import { feelsInClothes, fmtWarmFor } from './feels-in-clothes';

const LONDON = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
const hours = day(1, () => ({ temp: 3, feels: -2, wind: 25, rh: 85, cloud: 100 }));
const coat: LayerAdvice = { kind: 'outer', label: 'Warm coat', category: 'coat', thickness: 'medium', owned: 'owned', nickname: 'navy puffer' };

function advice(worn: number, minutes: number, layers: LayerAdvice[] = [coat]): Advice {
  return {
    band: 'coat',
    hours,
    layers,
    science: londonWhy({ exposureMinutes: minutes, outfit: { basic: worn, windLoss: 0.2 }, target: { ...londonWhy().target, bias: 0 } }),
  } as Advice;
}

describe('fmtWarmFor', () => {
  it('rounds down so it never promises more than the model gives', () => {
    expect(fmtWarmFor(7)).toBe('under 10 min');
    expect(fmtWarmFor(48)).toBe('about 40 min');
    expect(fmtWarmFor(89)).toBe('about 80 min');
    expect(fmtWarmFor(119)).toBe('about 1.5 h');
    expect(fmtWarmFor(130)).toBe('about 2 h');
  });
});

describe('feelsInClothes', () => {
  it('is warm the whole time in plenty of clothes, naming the wardrobe coat', () => {
    const l = feelsInClothes(advice(2.0, 30), LONDON)!;
    expect(l.tone).toBe('covered');
    expect(l.line).toMatch(/^Warm enough in your navy puffer (all day|for about .+)\.$/);
    expect(l.sub).toBe('You’re out for 30 min.');
  });

  it('turns a little cool when the time outside runs past the warm time', () => {
    const l = feelsInClothes(advice(1.3, 60), LONDON)!;
    expect(l.time.warm * 60).toBeLessThan(60);
    expect(l.time.bearable * 60).toBeGreaterThanOrEqual(60);
    expect(l).toMatchObject({ tone: 'cool', line: expect.stringMatching(/, then a little cool\.$/) });
  });

  it('asks for a layer when even mild discomfort would run out', () => {
    const l = feelsInClothes(advice(0.6, 120), LONDON)!;
    expect(l.tone).toBe('cold');
    expect(l.line).toMatch(/^Warm in your navy puffer for .+, cold after .+\.$/);
    expect(l.sub).toBe('You’re out for 2 h. Add a layer or warm up indoors on the way.');
  });

  it('says "this outfit" for generic advice and uses the band plan when layers could not be summed', () => {
    const generic = { ...coat, owned: 'unknown' as const, nickname: undefined };
    const a = advice(1.2, 30, [generic]);
    a.science = { ...a.science!, outfit: undefined };
    expect(feelsInClothes(a, LONDON)!.time.worn).toBeCloseTo(1.38);
    expect(feelsInClothes(a, LONDON)!.line).toContain('this outfit');
  });

  it('counts the personal bias: someone who runs cold gets less time', () => {
    const avg = feelsInClothes(advice(1.3, 30), LONDON)!;
    const a = advice(1.3, 30);
    a.science = { ...a.science!, target: { ...a.science!.target, bias: 0.2 } };
    expect(feelsInClothes(a, LONDON)!.time.warm).toBeLessThan(avg.time.warm);
  });

  it('stays out of the way for the bands and on warm days', () => {
    expect(feelsInClothes({ ...advice(1.3, 30), science: undefined }, LONDON)).toBeUndefined();
    const warm = advice(0.4, 30);
    warm.science = { ...warm.science!, target: { ...warm.science!.target, basis: 'heat-ladder' } };
    expect(feelsInClothes(warm, LONDON)).toBeUndefined();
  });
});
