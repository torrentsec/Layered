// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { CATALOGUE, completeness, ownership, type Inventory } from '../inventory';
import { comfortOffset } from '../comfort';
import { insulationPoints, layerPlan, requirementsFor } from '../requirements';
import { extrasFor, windowStats } from '../extras';
import { day } from './fixtures';

describe('inventory contract', () => {
  const inv: Inventory = { jumper: { counts: { thin: 0, medium: 2 } }, coat: { counts: { medium: 0 } }, boots: { counts: {} } };
  it('tells owned, none and unknown apart', () => {
    expect(ownership(inv, 'jumper')).toBe('owned');
    expect(ownership(inv, 'jumper', 'thin')).toBe('none');
    expect(ownership(inv, 'jumper', 'thick')).toBe('unknown');
    expect(ownership(inv, 'coat')).toBe('none');
    expect(ownership(inv, 'boots')).toBe('unknown');
    expect(ownership(inv, 'tshirt')).toBe('unknown');
  });
  it('measures completeness over the catalogue', () => {
    expect(completeness(inv)).toBeCloseTo(2 / CATALOGUE.length);
    expect(completeness({})).toBe(0);
  });
  it('has unique category ids', () => {
    expect(new Set(CATALOGUE.map((c) => c.id)).size).toBe(CATALOGUE.length);
  });
});

describe('comfort contract', () => {
  it('shifts by sensitivity', () => {
    expect(comfortOffset({ sensitivity: 'cold' }, 'walking')).toBeLessThan(0);
    expect(comfortOffset({ sensitivity: 'average' }, 'walking')).toBe(0);
    expect(comfortOffset({ sensitivity: 'warm' }, 'walking')).toBeGreaterThan(0);
  });
});

describe('requirements contract', () => {
  it('scores layer plans in warmth points', () => {
    expect(insulationPoints(layerPlan('tshirt'))).toBe(1);
    expect(insulationPoints(layerPlan('bundle'))).toBe(9);
  });
  it('derives rain, footwear and bottoms', () => {
    const hours = day(3, () => ({ feels: 4, precipProb: 80, precip: 1 }));
    const stats = windowStats(hours);
    const extras = extrasFor(stats, 4, 'walking');
    const r = requirementsFor({ effective: 4, band: 'coat', stats, extras, activity: 'walking' });
    expect(r.rain).toBe('waterproof');
    expect(r.footwear).toBe('waterproof');
    expect(r.bottoms).toBe('heavy');
    expect(r.accessories).toContain('gloves');
  });
});
