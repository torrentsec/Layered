// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { MAX_GAPS, missingForToday } from '../gaps';
import type { Inventory } from '../inventory';
import { insulationPoints, layerPlan, type Requirements } from '../requirements';
import type { BandId } from '../types';

function req(band: BandId, over: Partial<Requirements> = {}): Requirements {
  const layers = layerPlan(band);
  return {
    effective: 5,
    band,
    insulation: insulationPoints(layers),
    layers,
    rain: 'none',
    wind: 'none',
    bottoms: 'standard',
    footwear: 'closed',
    removable: false,
    accessories: [],
    ...over,
  };
}

const own = { counts: { medium: 1 } };
const none = { counts: { thin: 0, medium: 0, thick: 0 } };
const ids = (r: Requirements, inv: Inventory = {}) => missingForToday(r, inv).map((g) => g.id);
// Enough set that only the rule under test can fire.
const dressed: Inventory = { longsleeve: own, jumper: own, coat: own, trainers: own };

describe('missingForToday', () => {
  it('asks for nothing on a mild dry day with the basics set', () => {
    expect(ids(req('two'), dressed)).toEqual([]);
  });

  it('never returns more than three, most useful first', () => {
    const r = req('coat', { rain: 'waterproof', footwear: 'waterproof', accessories: ['gloves', 'hat'] });
    const gaps = missingForToday(r, {});
    expect(gaps).toHaveLength(MAX_GAPS);
    expect(gaps.map((g) => g.id)).toEqual(['waterproof-jacket', 'coat', 'waterproof-shoes']);
    expect(gaps.every((g) => g.reason.length > 0)).toBe(true);
  });

  describe('rain', () => {
    it('asks for waterproof jackets when rain needs one and none is owned', () => {
      expect(ids(req('coat', { rain: 'waterproof' }), dressed)).toEqual(['waterproof-jacket']);
      expect(ids(req('coat', { rain: 'hood' }), dressed)).toEqual(['waterproof-jacket']);
    });
    it('does not ask once an owned outer layer is waterproof', () => {
      expect(ids(req('coat', { rain: 'waterproof' }), { ...dressed, coat: { ...own, water: 'waterproof' } })).toEqual([]);
    });
    it('does not ask once waterproof jackets are set, owned or not', () => {
      expect(ids(req('coat', { rain: 'waterproof' }), { ...dressed, 'waterproof-jacket': none })).toEqual([]);
    });
    it('asks on a band without an outer layer too', () => {
      expect(ids(req('two', { rain: 'waterproof' }), dressed)).toEqual(['waterproof-jacket']);
    });
    it('asks for an umbrella only when an umbrella is the advice', () => {
      expect(ids(req('two', { rain: 'umbrella' }), dressed)).toEqual(['umbrella']);
      expect(ids(req('two', { rain: 'umbrella' }), { ...dressed, umbrella: none })).toEqual([]);
    });
  });

  describe('layers', () => {
    it('asks for the best-fitting outer category when nothing owned fills the slot', () => {
      expect(ids(req('coat'), { longsleeve: own, jumper: own, trainers: own })).toEqual(['coat']);
      expect(ids(req('jacket'), { longsleeve: own, jumper: own, trainers: own })).toEqual(['light-jacket']);
    });
    it('skips categories the user has said they do not own', () => {
      expect(ids(req('coat'), { longsleeve: own, jumper: own, trainers: own, coat: none })).toEqual(['insulated-jacket']);
    });
    it('asks nothing for a slot an owned category already fills', () => {
      expect(ids(req('coat'), { longsleeve: own, jumper: own, trainers: own, 'light-jacket': own })).toEqual([]);
    });
    it('asks for a mid layer before a base layer', () => {
      expect(ids(req('two'), { trainers: own })).toEqual(['jumper', 'longsleeve']);
    });
    it('ignores an optional mid layer', () => {
      expect(ids(req('light'), { trainers: own })).toEqual(['tshirt']);
    });
  });

  describe('footwear', () => {
    it('asks for waterproof shoes on a wet day', () => {
      expect(ids(req('two', { footwear: 'waterproof' }), { longsleeve: own, jumper: own })).toEqual(['waterproof-shoes']);
      expect(ids(req('two', { footwear: 'waterproof' }), { longsleeve: own, jumper: own, trainers: own })).toEqual(['waterproof-shoes']);
    });
    it('asks for boots first in snow', () => {
      expect(ids(req('two', { footwear: 'boots' }), { longsleeve: own, jumper: own })).toEqual(['boots']);
    });
    it('does not ask when owned shoes already keep feet dry', () => {
      expect(ids(req('two', { footwear: 'waterproof' }), { longsleeve: own, jumper: own, boots: own })).toEqual([]);
    });
    it('does not ask for shoes on a dry day', () => {
      expect(ids(req('two'), { longsleeve: own, jumper: own })).toEqual([]);
    });
  });

  describe('accessories', () => {
    it('asks for gloves, then a hat, when the cold calls for them', () => {
      expect(ids(req('coat', { accessories: ['hat', 'gloves'] }), dressed)).toEqual(['gloves', 'hat']);
    });
    it('does not ask once they are set', () => {
      expect(ids(req('coat', { accessories: ['hat', 'gloves'] }), { ...dressed, gloves: own, hat: none })).toEqual([]);
    });
    it('ignores accessories that are not categories', () => {
      expect(ids(req('tshirt', { accessories: ['sunglasses', 'sunscreen'] }), { tshirt: own, trainers: own })).toEqual([]);
    });
  });
});
