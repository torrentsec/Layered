// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { marginText } from './margin-text';

describe('marginText', () => {
  it('names the shift in whole degrees, rounded up, and the band it gives', () => {
    const t = marginText({ band: 'two', warmer: { by: 2.5, band: 'light' }, colder: { by: 0.5, band: 'jacket' } }, 'c');
    expect(t.rows).toEqual([
      { label: '3° warmer', value: 'Light layer optional' },
      { label: '1° colder', value: 'Jacket on' },
    ]);
    expect(t.steady).toBeUndefined();
    expect(t.close).toBe(true);
  });

  it('shows and judges the shift in Fahrenheit', () => {
    const t = marginText({ band: 'two', warmer: { by: 2.5, band: 'light' }, colder: { by: 1, band: 'jacket' } }, 'f');
    expect(t.rows.map((r) => r.label)).toEqual(['5° warmer', '2° colder']);
    // 1 K is 1.8 °F: close in Celsius, not a one-degree miss in Fahrenheit.
    expect(t.close).toBe(false);
    expect(marginText({ band: 'two', colder: { by: 1, band: 'jacket' } }, 'c').close).toBe(true);
    expect(marginText({ band: 'two', colder: { by: 0.5, band: 'jacket' } }, 'f').close).toBe(true);
  });

  it('states what holds instead of listing a no-change row', () => {
    expect(marginText({ band: 'coat' }, 'c')).toEqual({ rows: [], steady: 'Same advice within 5° either way.', close: false, show: false });
    expect(marginText({ band: 'coat' }, 'f').steady).toBe('Same advice within 9° either way.');
    const one = marginText({ band: 'coat', warmer: { by: 4, band: 'jacket' } }, 'c');
    expect(one.rows).toEqual([{ label: '4° warmer', value: 'Jacket on' }]);
    expect(one.steady).toBe('Same advice even 5° colder.');
  });

  it('shows only when 2° or less would change the advice, in the reader’s unit', () => {
    const near = { band: 'two' as const, colder: { by: 1.5, band: 'jacket' as const } };
    // 1.5 K reads as 2° in Celsius but 3° in Fahrenheit.
    expect(marginText(near, 'c').show).toBe(true);
    expect(marginText(near, 'f').show).toBe(false);
    expect(marginText({ band: 'two', colder: { by: 1, band: 'jacket' } }, 'f').show).toBe(true);
    expect(marginText({ band: 'two', warmer: { by: 2.5, band: 'light' } }, 'c').show).toBe(false);
    expect(marginText({ band: 'coat' }, 'c').show).toBe(false);
  });
});
