// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../engine/advise';
import { day } from '../engine/__tests__/fixtures';
import { hourUtci } from '../engine/science/hourly';
import { utci, weatherUtci } from '../engine/science/utci';
import { hourToWeather } from '../engine/science/weather';
import { fmt24 } from '../engine/time';
import type { Advice } from '../engine/types';
import { londonWhy } from './__fixtures__/science-why';
import { feelsRange, heroReading, hourlyFeels, scienceLead } from './why-science';

const LONDON = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
// Cold, windy, damp London morning warming into the afternoon.
const hours = day(10, (i) => ({ temp: 2 + i * 0.8, feels: -1 + i, wind: 22 - i, rh: 88, cloud: 90 }));

describe('hourUtci', () => {
  it('is the UTCI of the same weather the advice is built from', () => {
    const w = hourToWeather(hours[3], LONDON);
    expect(hourUtci(hours[3], LONDON)).toEqual(weatherUtci(w));
    expect(weatherUtci(w)).toEqual(utci(w.ta, w.tmrt, w.wind10, w.rh));
  });
});

describe('heroReading', () => {
  it('keeps the bands’ dress-for number without the science engine', () => {
    expect(heroReading({ effective: 2.7 } as Advice, 'c')).toEqual({ value: 2.7, text: '2°', label: 'Dress for' });
  });

  it('shows the coldest hour’s UTCI with the same rounding as “Why this?”', () => {
    const a = { effective: 2.7, science: londonWhy() } as Advice;
    const r = heroReading(a, 'c');
    expect(r).toEqual({ value: -3.2, text: '-3°', label: 'Feels like' });
    expect(scienceLead(londonWhy(), 'c', fmt24)).toContain(`feel like ${r.text}`);
    expect(heroReading(a, 'f').text).toBe('26°');
  });

  it('never shows a number UTCI cannot give', () => {
    const hot = londonWhy({ utci: { utci: NaN, category: 'extreme-heat', clamped: false, outOfRange: true } });
    expect(heroReading({ effective: 34, science: hot } as Advice, 'c')).toMatchObject({ value: 34, label: 'Dress for' });
  });
});

describe('hourlyFeels', () => {
  it('keeps apparent temperature without the science engine', () => {
    const a = advise({ hours, activity: 'walking' })!;
    expect(hourlyFeels(hours, a, LONDON)).toEqual(hours.map((h) => h.feels));
  });

  it('agrees with “Why this?” on every hour of the window', () => {
    const window = hours.slice(2, 6);
    const a = advise({ hours: window, activity: 'walking', science: { place: LONDON, bias: 0, biasCount: 0, exposureHours: 4 } })!;
    const strip = hourlyFeels(hours, a, LONDON);
    const inWindow = strip.slice(2, 6) as number[];
    expect(Math.min(...inWindow)).toBe(a.science!.utci.utci);
    expect({ min: Math.min(...inWindow), max: Math.max(...inWindow) }).toEqual(feelsRange(a));
    expect(heroReading(a, 'c').value).toBe(Math.min(...inWindow));
    const coldest = hours.findIndex((h) => h.time === a.science!.coldestHour);
    expect(strip[coldest]).toBe(a.science!.utci.utci);
  });

  it('leaves an hour blank when UTCI has no trustworthy number', () => {
    const steamy = day(2, (i) => ({ temp: i ? 44 : 20, feels: i ? 50 : 20, rh: 95, wind: 5 }));
    const a = advise({ hours: steamy, activity: 'walking', science: { place: LONDON, bias: 0, biasCount: 0 } })!;
    const strip = hourlyFeels(steamy, a, LONDON);
    expect(strip[1]).toBeNull();
    expect(Number.isFinite(strip[0])).toBe(true);
  });
});
