// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { bandFor, bandRank, TORRENTSEC_THRESHOLD_C } from '../bands';
import { advise } from '../advise';
import { ACTIVITY_OFFSET } from '../activity';
import { day } from './fixtures';

describe('bands', () => {
  it.each([
    [30, 'tshirt'], [22, 'tshirt'], [21.9, 'light'], [17, 'light'], [16.9, 'two'], [12, 'two'],
    [11.9, 'jacket'], [7, 'jacket'], [6.9, 'coat'], [2, 'coat'], [1.9, 'bundle'], [-15, 'bundle'],
  ])('%s° → %s', (t, id) => {
    expect(bandFor(t).id).toBe(id);
  });

  it('bundles up below the named threshold', () => {
    expect(TORRENTSEC_THRESHOLD_C).toBe(2);
    expect(bandFor(TORRENTSEC_THRESHOLD_C - 0.1).verdict).toBe('Bundle up');
  });

  it('ranks colder bands higher', () => {
    expect(bandRank('bundle')).toBeGreaterThan(bandRank('coat'));
    expect(bandRank('tshirt')).toBe(0);
  });

  it('marks the light layer as optional at 17–22', () => {
    expect(bandFor(19).layers.find((l) => l.kind === 'mid')?.optional).toBe(true);
  });
});

describe('effective temperature', () => {
  it('uses the coldest feels-like hour in the window', () => {
    const a = advise({ hours: day(3, (i) => ({ feels: [10, 4, 9][i] })), activity: 'walking' })!;
    expect(a.effective).toBe(4);
    expect(a.why.coldestHour).toBe('2026-11-26T09:00');
    expect(a.band).toBe('coat');
  });

  it.each(Object.entries(ACTIVITY_OFFSET))('applies the %s offset', (activity, offset) => {
    const a = advise({ hours: day(2, () => ({ feels: 10 })), activity: activity as never })!;
    expect(a.effective).toBe(10 + offset);
    expect(a.why.activityOffset).toBe(offset);
  });

  it('adds the manual offset', () => {
    const a = advise({ hours: day(2, () => ({ feels: 10 })), activity: 'walking', manualOffset: -2.5 })!;
    expect(a.effective).toBe(7.5);
  });

  it('returns null for an empty window', () => {
    expect(advise({ hours: [], activity: 'walking' })).toBeNull();
  });
});
