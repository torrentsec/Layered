// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  ACTIVITY_EXPOSURE,
  ACTIVITY_LABEL,
  ACTIVITY_OFFSET,
  COMMUTE_MODES,
  COMMUTE_MODE_LABEL,
  EFFORT_ACTIVITIES,
  EFFORT_LABEL,
  EFFORTS,
  effortOffset,
  scalesWithEffort,
} from '../activity';
import { advise } from '../advise';
import { adviseCommute } from '../commute';
import type { Activity, Effort } from '../types';
import { day } from './fixtures';

describe('effort (US-067)', () => {
  it('offers easy, steady and hard', () => {
    expect(EFFORTS).toEqual(['easy', 'steady', 'hard']);
    expect(EFFORTS.map((e) => EFFORT_LABEL[e])).toEqual(['Easy', 'Steady', 'Hard']);
  });

  it('only scales running, cycling and hiking', () => {
    expect(EFFORT_ACTIVITIES).toEqual(['running', 'cycling', 'hiking']);
    expect(ACTIVITIES.filter(scalesWithEffort)).toEqual(['cycling', 'running', 'hiking']);
  });

  it.each([
    ['running', 'easy', 5],
    ['running', 'steady', 8],
    ['running', 'hard', 11],
    ['hiking', 'easy', 1],
    ['hiking', 'steady', 3],
    ['hiking', 'hard', 5],
    // Harder riding warms you but also adds wind, so the gain is smaller.
    ['cycling', 'easy', -5],
    ['cycling', 'steady', -4],
    ['cycling', 'hard', -2],
  ] as [Activity, Effort, number][])('%s at %s effort counts as %s°', (activity, effort, offset) => {
    expect(effortOffset(activity, effort)).toBe(offset);
  });

  it('nets less warming for a hard ride than for a hard run', () => {
    expect(effortOffset('cycling', 'hard') - effortOffset('cycling', 'steady')).toBeLessThan(effortOffset('running', 'hard') - effortOffset('running', 'steady'));
    expect(effortOffset('cycling', 'hard')).toBeLessThan(0);
  });

  it('defaults to steady', () => {
    for (const a of ACTIVITIES) expect(effortOffset(a)).toBe(ACTIVITY_OFFSET[a]);
  });

  it.each(ACTIVITIES.filter((a) => !scalesWithEffort(a)))('ignores effort for %s', (a) => {
    for (const e of EFFORTS) expect(effortOffset(a, e)).toBe(ACTIVITY_OFFSET[a]);
  });

  it('feeds the effective temperature and the explanation', () => {
    const hours = day(2, () => ({ feels: 4 }));
    const steady = advise({ hours, activity: 'running' })!;
    const hard = advise({ hours, activity: 'running', effort: 'hard' })!;
    const easy = advise({ hours, activity: 'running', effort: 'easy' })!;
    expect(steady.effective).toBe(12);
    expect(hard.effective).toBe(15);
    expect(easy.effective).toBe(9);
    expect(hard.why.activityOffset).toBe(11);
  });

  it('leaves walking advice alone whatever the effort', () => {
    const hours = day(2, () => ({ feels: 4 }));
    expect(advise({ hours, activity: 'walking', effort: 'hard' })!.effective).toBe(advise({ hours, activity: 'walking' })!.effective);
  });
});

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
