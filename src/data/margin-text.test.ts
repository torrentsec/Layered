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
    expect(t.close).toBe(true);
  });

  it('converts the shift for Fahrenheit without the offset', () => {
    const t = marginText({ band: 'two', warmer: { by: 2.5, band: 'light' }, colder: { by: 0.5, band: 'jacket' } }, 'f');
    expect(t.rows.map((r) => r.label)).toEqual(['5° warmer', '1° colder']);
  });

  it('says no change when the band holds past the reach', () => {
    const t = marginText({ band: 'coat' }, 'c');
    expect(t.rows).toEqual([
      { label: '5° warmer', value: 'No change' },
      { label: '5° colder', value: 'No change' },
    ]);
    expect(t.close).toBe(false);
  });
});
