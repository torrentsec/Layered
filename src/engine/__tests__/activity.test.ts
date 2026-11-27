// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { ACTIVITIES, ACTIVITY_EXPOSURE, ACTIVITY_LABEL, ACTIVITY_OFFSET, COMMUTE_MODES, COMMUTE_MODE_LABEL } from '../activity';
import { advise } from '../advise';
import { adviseCommute } from '../commute';
import type { Activity } from '../types';
import { day } from './fixtures';

describe('activities', () => {
  it('waits at stops on an office day', () => expect(ACTIVITY_OFFSET.office).toBe(-1));
  it('adds nothing for staying in', () => expect(ACTIVITY_OFFSET.indoors).toBe(0));

  it('labels the new activities', () => {
    expect(ACTIVITY_LABEL.office).toBe('Office day');
    expect(ACTIVITY_LABEL.indoors).toBe('Staying in');
  });

  it('lists every activity once, common ones first', () => {
    expect(new Set(ACTIVITIES)).toEqual(new Set(Object.keys(ACTIVITY_OFFSET)));
    expect(ACTIVITIES).toHaveLength(Object.keys(ACTIVITY_OFFSET).length);
    expect(ACTIVITIES.slice(0, 2)).toEqual(['walking', 'office']);
  });

  it('keeps indoor days to a short exposure', () => {
    expect(ACTIVITY_EXPOSURE.office).toBe(2);
    expect(ACTIVITY_EXPOSURE.indoors).toBe(2);
    expect(ACTIVITY_EXPOSURE.hiking).toBeUndefined();
  });

  it.each([['office', 9], ['indoors', 10]] as [Activity, number][])('%s lands at %s° from a 10° hour', (activity, effective) => {
    expect(advise({ hours: day(2, () => ({ feels: 10 })), activity })!.effective).toBe(effective);
  });
});

describe('commute travel mode', () => {
  const out = day(1, () => ({ feels: 6 }), 8);
  const back = day(1, () => ({ feels: 9 }), 17);

  it('offers walk, cycle and public transport', () => {
    expect(COMMUTE_MODES).toEqual(['walking', 'cycling', 'transport']);
    expect(COMMUTE_MODES.map((m) => COMMUTE_MODE_LABEL[m])).toEqual(['Walk', 'Cycle', 'Public transport']);
  });

  it.each([['walking', 6, 9], ['cycling', 2, 5], ['transport', 5, 8]] as [Activity, number, number][])(
    'judges both legs as %s',
    (activity, outEff, backEff) => {
      const c = adviseCommute({ activity }, out, back)!;
      expect(c.out.effective).toBe(outEff);
      expect(c.back.effective).toBe(backEff);
      expect(c.advice.effective).toBe(outEff);
      expect(c.advice.why.activityOffset).toBe(ACTIVITY_OFFSET[activity]);
    },
  );

  it('cycling in dresses warmer than an office day on the same legs', () => {
    const office = adviseCommute({ activity: 'office' }, out, back)!;
    const cycling = adviseCommute({ activity: 'cycling' }, out, back)!;
    expect(cycling.advice.effective).toBe(office.advice.effective - 3);
  });
});
