// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { ACTIVITY_EXPOSURE } from '../engine/activity';
import { outForAfter } from './out-for';

describe('outForAfter', () => {
  it('sets the exposure for office and indoor days', () => {
    expect(outForAfter('office', { duration: 10, swap: null })).toEqual({ duration: ACTIVITY_EXPOSURE.office, swap: { was: 10, set: 2 } });
    expect(outForAfter('indoors', { duration: 5, swap: null }).duration).toBe(ACTIVITY_EXPOSURE.indoors);
  });
  it('restores the earlier duration when moving to another activity', () => {
    const office = outForAfter('office', { duration: 10, swap: null });
    expect(outForAfter('walking', office)).toEqual({ duration: 10, swap: null });
  });
  it('remembers the first duration across office then staying in', () => {
    const indoors = outForAfter('indoors', outForAfter('office', { duration: 10, swap: null }));
    expect(outForAfter('cycling', indoors).duration).toBe(10);
  });
  it('keeps a duration the user picked after choosing an office day', () => {
    expect(outForAfter('walking', { duration: 5, swap: null })).toEqual({ duration: 5, swap: null });
  });
  it('keeps the duration if it no longer matches what was set', () => {
    expect(outForAfter('walking', { duration: 5, swap: { was: 10, set: 2 } }).duration).toBe(5);
  });
  it('leaves other activities alone', () => {
    expect(outForAfter('running', { duration: 5, swap: null })).toEqual({ duration: 5, swap: null });
  });
});
