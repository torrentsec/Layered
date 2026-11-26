// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { fmtTemp, localiseTemp, localiseWind, wind } from './units';

describe('units', () => {
  it('converts readings', () => {
    expect(fmtTemp(0, 'f')).toBe('32°');
    expect(fmtTemp(-2.4, 'c')).toBe('-2°');
  });
  it('converts wind', () => {
    expect(wind(36, 'ms')).toBe('10 m/s');
    expect(wind(32, 'mph')).toBe('20 mph');
  });
  it('localises engine text, treating +N° as a difference', () => {
    expect(localiseTemp('Feels like 0°, under 5°', 'f')).toBe('Feels like 32°, under 41°');
    expect(localiseTemp('rises +5° while out', 'f')).toBe('rises +9° while out');
    expect(localiseWind('Gusts 50 km/h', 'mph')).toBe('Gusts 31 mph');
  });
});
