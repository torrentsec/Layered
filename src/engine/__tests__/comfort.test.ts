// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ACTIVITIES,
  COLD_WHEN_STILL_OFFSET,
  comfortOffset,
  DEFAULT_COMFORT,
  OVERHEAT_WHEN_ACTIVE_OFFSET,
  SENSITIVITY_OFFSET,
  STILL_ACTIVITIES,
  type ComfortProfile,
  type Sensitivity,
} from '../comfort';
import { ACTIVITIES } from '../activity';
import type { Activity } from '../types';

const ACTIVE: Activity[] = ['walking', 'hiking', 'running', 'cycling'];
const STILL: Activity[] = ['standing', 'transport', 'night'];

describe('comfortOffset', () => {
  it('uses the sensitivity offset on its own', () => {
    expect(SENSITIVITY_OFFSET).toEqual({ cold: -2, average: 0, warm: 2 });
    for (const a of ACTIVITIES) {
      expect(comfortOffset({ sensitivity: 'cold' }, a)).toBe(-2);
      expect(comfortOffset({ sensitivity: 'average' }, a)).toBe(0);
      expect(comfortOffset({ sensitivity: 'warm' }, a)).toBe(2);
    }
  });

  it('defaults to no offset', () => {
    expect(comfortOffset(DEFAULT_COMFORT, 'walking')).toBe(0);
  });

  it('adds the overheat offset only for active outdoor activities', () => {
    const p: ComfortProfile = { sensitivity: 'average', overheatWhenWalking: true };
    expect(OVERHEAT_WHEN_ACTIVE_OFFSET).toBeGreaterThan(0);
    for (const a of ACTIVE) expect(comfortOffset(p, a)).toBe(OVERHEAT_WHEN_ACTIVE_OFFSET);
    for (const a of STILL) expect(comfortOffset(p, a)).toBe(0);
  });

  it('adds the cold-when-still offset only for stationary activities', () => {
    const p: ComfortProfile = { sensitivity: 'average', coldWhenStill: true };
    expect(COLD_WHEN_STILL_OFFSET).toBeLessThan(0);
    for (const a of STILL) expect(comfortOffset(p, a)).toBe(COLD_WHEN_STILL_OFFSET);
    for (const a of ACTIVE) expect(comfortOffset(p, a)).toBe(0);
  });

  it('ignores preferences that are switched off', () => {
    const p: ComfortProfile = { sensitivity: 'warm', overheatWhenWalking: false, coldWhenStill: false };
    expect(comfortOffset(p, 'walking')).toBe(2);
    expect(comfortOffset(p, 'standing')).toBe(2);
  });

  it('stacks sensitivity with a preference', () => {
    const p: ComfortProfile = { sensitivity: 'cold', overheatWhenWalking: true, coldWhenStill: true };
    expect(comfortOffset(p, 'running')).toBe(-2 + OVERHEAT_WHEN_ACTIVE_OFFSET);
    expect(comfortOffset(p, 'night')).toBe(-2 + COLD_WHEN_STILL_OFFSET);
  });

  it('leaves wind and rain tolerance out of the temperature offset', () => {
    expect(comfortOffset({ sensitivity: 'average', windTolerance: 'low', rainTolerance: 'high' }, 'walking')).toBe(0);
  });

  it('gives an unknown activity only the sensitivity offset', () => {
    const p: ComfortProfile = { sensitivity: 'warm', overheatWhenWalking: true, coldWhenStill: true };
    expect(comfortOffset(p, 'skiing' as Activity)).toBe(2);
  });

  it('treats an unknown sensitivity as average', () => {
    expect(comfortOffset({ sensitivity: 'freezing' as Sensitivity }, 'walking')).toBe(0);
  });

  it('places every current activity in exactly one group', () => {
    for (const a of ACTIVITIES) expect(Number(ACTIVE_ACTIVITIES.includes(a)) + Number(STILL_ACTIVITIES.includes(a))).toBe(1);
  });
});
