// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { category, ownership } from '../engine/inventory';
import { clearCounts, dontOwn, patchDetails, stepCount, summarise, thicknessesOf, withEntry } from './inventory-edit';

const jumper = category('jumper');
const gloves = category('gloves');

describe('stepCount', () => {
  it('counts up from not set', () => {
    expect(stepCount(undefined, 'thin', 1)).toEqual({ counts: { thin: 1 } });
  });
  it('leaves not set alone when stepping down', () => {
    expect(stepCount(undefined, 'thin', -1)).toEqual({ counts: {} });
    expect(stepCount({ counts: { thick: 2 } }, 'thin', -1)).toEqual({ counts: { thick: 2 } });
  });
  it('stops at 0, which reads as don’t own', () => {
    const e = stepCount({ counts: { thin: 1 } }, 'thin', -1);
    expect(e.counts.thin).toBe(0);
    expect(stepCount(e, 'thin', -1).counts.thin).toBe(0);
    expect(ownership({ jumper: e }, 'jumper')).toBe('none');
  });
  it('keeps other details', () => {
    expect(stepCount({ counts: {}, nickname: 'mac' }, 'medium', 1)).toEqual({ counts: { medium: 1 }, nickname: 'mac' });
  });
});

describe('dontOwn and clearCounts', () => {
  it('sets every applicable thickness to 0', () => {
    expect(dontOwn({ counts: { thin: 3 } }, jumper).counts).toEqual({ thin: 0, medium: 0, thick: 0 });
    expect(dontOwn(undefined, gloves).counts).toEqual({ medium: 0 });
  });
  it('clears back to not set, keeping details', () => {
    expect(clearCounts({ counts: { thin: 0 } })).toBeUndefined();
    expect(clearCounts({ counts: { thin: 2 }, nickname: 'puffer' })).toEqual({ counts: {}, nickname: 'puffer' });
    expect(clearCounts(undefined)).toBeUndefined();
  });
});

describe('patchDetails', () => {
  it('sets and removes optional properties', () => {
    const e = patchDetails(undefined, { water: 'waterproof', material: ['wool'] });
    expect(e).toEqual({ counts: {}, water: 'waterproof', material: ['wool'] });
    expect(patchDetails(e, { water: undefined, material: [] })).toBeUndefined();
    expect(patchDetails({ counts: { thin: 1 } }, { nickname: '' })).toEqual({ counts: { thin: 1 } });
  });
});

describe('withEntry', () => {
  it('adds, replaces and removes without mutating', () => {
    const inv = { hat: { counts: { medium: 1 } } };
    expect(withEntry(inv, 'scarf', { counts: { medium: 0 } })).toEqual({ ...inv, scarf: { counts: { medium: 0 } } });
    expect(withEntry(inv, 'hat', undefined)).toEqual({});
    expect(inv.hat).toBeDefined();
  });
});

describe('summarise', () => {
  it('tells not set, don’t own and counts apart', () => {
    expect(summarise(undefined, jumper)).toBe('Not set');
    expect(summarise({ counts: {} }, jumper)).toBe('Not set');
    expect(summarise({ counts: { thin: 0, medium: 0, thick: 0 } }, jumper)).toBe('Don’t own');
    expect(summarise({ counts: { thin: 0 } }, jumper)).toBe('Partly set');
    expect(summarise({ counts: { thin: 2, medium: 0, thick: 1 } }, jumper)).toBe('2 thin · 1 thick');
    expect(summarise({ counts: { medium: 3 } }, gloves)).toBe('3');
    expect(summarise({ counts: { medium: 0 } }, gloves)).toBe('Don’t own');
  });
  it('uses a single count for categories without thickness', () => {
    expect(thicknessesOf(gloves)).toEqual(['medium']);
    expect(thicknessesOf(jumper)).toEqual(['thin', 'medium', 'thick']);
  });
});
