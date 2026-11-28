// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import { BANDS } from '../bands';
import { CATALOGUE, type Inventory } from '../inventory';
import { CLO_PER_POINT, LIMITATION, matchInventory, withoutCovered } from '../match';
import { ensembleClo } from '../science/clothing';
import type { ClothingTarget } from '../science/types';
import { insulationPoints, layerPlan, type Requirements } from '../requirements';
import type { BandId, Extra, LayerAdvice } from '../types';
import { day } from './fixtures';

const EFFECTIVE: Record<BandId, number> = { tshirt: 24, light: 18, two: 14, jacket: 9, coat: 4, bundle: -4 };

function req(band: BandId, over: Partial<Requirements> = {}): Requirements {
  const layers = layerPlan(band);
  return {
    effective: EFFECTIVE[band],
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

const own = (...t: ('thin' | 'medium' | 'thick')[]) => ({ counts: { thin: 0, medium: 0, thick: 0, ...Object.fromEntries(t.map((x) => [x, 1])) } });
const none = { counts: { thin: 0, medium: 0, thick: 0 } };
const plain = { counts: { medium: 1 } };
const find = (ls: LayerAdvice[], kind: LayerAdvice['kind']) => ls.find((l) => l.kind === kind);
const points = { thin: 1, medium: 2, thick: 3 } as const;
const upperPoints = (ls: LayerAdvice[]) =>
  ls.filter((l) => (l.kind === 'base' || l.kind === 'mid' || l.kind === 'outer') && !l.optional && l.label !== 'Waterproof').reduce((n, l) => n + points[l.thickness!], 0);

describe('matchInventory: empty inventory', () => {
  for (const b of BANDS) {
    it(`gives today's generic layers for ${b.id}`, () => {
      const m = matchInventory(req(b.id), {});
      expect(m.layers.map((l) => [l.kind, l.label, !!l.optional])).toEqual(b.layers.map((l) => [l.kind, l.label, !!l.optional]));
      expect(m.layers.every((l) => l.owned === 'unknown' && !l.category)).toBe(true);
      expect(m.limitations).toEqual([]);
      expect(m.alternatives).toEqual([]);
    });
  }
  it('adds no rain limitation before anything is recorded', () => {
    expect(matchInventory(req('coat', { rain: 'waterproof' }), {}).limitations).toEqual([]);
  });
});

describe('matchInventory: owned only', () => {
  it('picks the exact thickness when owned', () => {
    const m = matchInventory(req('coat'), { longsleeve: own('medium'), jumper: own('thin', 'medium', 'thick'), coat: own('medium') });
    expect(m.layers.map((l) => [l.category, l.thickness, l.owned])).toEqual([
      ['longsleeve', 'medium', 'owned'],
      ['jumper', 'medium', 'owned'],
      ['coat', 'medium', 'owned'],
    ]);
  });
  it('never recommends a category marked as not owned', () => {
    const m = matchInventory(req('coat'), { coat: none, 'insulated-jacket': own('medium') });
    expect(find(m.layers, 'outer')?.category).toBe('insulated-jacket');
    for (const l of [...m.layers, ...m.alternatives.flat()]) expect(l.category).not.toBe('coat');
  });
  it('never recommends a thickness marked as not owned', () => {
    const m = matchInventory(req('bundle'), { jumper: { counts: { thick: 0, medium: 1 } } });
    expect(find(m.layers, 'mid')?.thickness).toBe('medium');
  });
  it('falls back to generic advice when only unknowns remain', () => {
    const m = matchInventory(req('coat'), { jumper: none, coat: own('medium') });
    const mid = find(m.layers, 'mid')!;
    expect(mid.label).toBe('Jumper');
    expect(mid.owned).toBe('unknown');
    expect(mid.category).toBeUndefined();
    expect(m.limitations).toEqual([]);
  });
  it('says what is missing when nothing suitable is owned, and still advises', () => {
    const m = matchInventory(req('coat'), { jumper: none, cardigan: none, hoodie: none, fleece: none });
    const mid = find(m.layers, 'mid')!;
    expect(mid.label).toBe('Jumper');
    expect(mid.owned).toBe('none');
    expect(m.limitations).toContain(LIMITATION.mid);
  });
  it('leaves out an optional light layer you have none of', () => {
    const m = matchInventory(req('light'), { jumper: none, cardigan: none, hoodie: none, fleece: none });
    expect(find(m.layers, 'mid')).toBeUndefined();
    expect(m.limitations).toEqual([]);
  });
  it('keeps the optional flag on an owned light layer', () => {
    const m = matchInventory(req('light'), { cardigan: own('thin') });
    expect(find(m.layers, 'mid')).toMatchObject({ category: 'cardigan', thickness: 'thin', optional: true, owned: 'owned' });
  });
  it('prefers a T-shirt to a thermal on a warm day', () => {
    const m = matchInventory(req('tshirt'), { tshirt: own('thin'), thermal: own('thin') });
    expect(find(m.layers, 'base')?.category).toBe('tshirt');
  });
  it('does not put a thermal on for a T-shirt day', () => {
    const m = matchInventory(req('tshirt'), { thermal: own('thin'), tshirt: none, longsleeve: none });
    expect(find(m.layers, 'base')?.category).toBeUndefined();
    expect(m.limitations).toContain(LIMITATION.base);
  });
});

describe('matchInventory: thickness trading', () => {
  it('meets the target with a thick jumper and a thin jacket', () => {
    const r = req('coat');
    const m = matchInventory(r, { longsleeve: own('medium'), jumper: own('thick'), 'light-jacket': own('thin') });
    expect(find(m.layers, 'mid')?.thickness).toBe('thick');
    expect(find(m.layers, 'outer')?.thickness).toBe('thin');
    expect(upperPoints(m.layers)).toBe(r.insulation);
  });
  it('does not overshoot by more than a point when it can avoid it', () => {
    const r = req('jacket');
    const m = matchInventory(r, { longsleeve: own('medium', 'thick'), jumper: own('thin', 'thick'), 'light-jacket': own('thin', 'thick') });
    const total = upperPoints(m.layers);
    expect(total).toBeGreaterThanOrEqual(r.insulation);
    expect(total).toBeLessThanOrEqual(r.insulation + 1);
  });
  it('goes warmer rather than colder when it has to', () => {
    const r = req('two');
    const m = matchInventory(r, { longsleeve: own('medium'), jumper: own('thick') });
    expect(upperPoints(m.layers)).toBe(5);
  });
  it('says so when the warmest clothes fall short', () => {
    const m = matchInventory(req('bundle'), { thermal: own('thin'), longsleeve: none, tshirt: none, jumper: own('thin'), coat: own('thin') });
    expect(m.limitations).toContain(LIMITATION.shortfall);
  });
});

describe('matchInventory: rain and wind', () => {
  it('prefers a waterproof outer when rain needs one', () => {
    const inv: Inventory = { coat: own('medium'), 'waterproof-jacket': own('medium') };
    expect(find(matchInventory(req('coat'), inv).layers, 'outer')?.category).toBe('coat');
    expect(find(matchInventory(req('coat', { rain: 'waterproof' }), inv).layers, 'outer')?.category).toBe('waterproof-jacket');
  });
  it('uses the entry water resistance over the catalogue default', () => {
    const inv: Inventory = { coat: { ...own('medium'), water: 'waterproof' }, 'insulated-jacket': own('medium') };
    expect(find(matchInventory(req('coat', { rain: 'hood' }), inv).layers, 'outer')?.category).toBe('coat');
  });
  it('takes water resistant when nothing is waterproof', () => {
    const inv: Inventory = { coat: own('medium'), 'insulated-jacket': own('medium'), 'waterproof-jacket': none };
    const m = matchInventory(req('coat', { rain: 'waterproof' }), inv);
    expect(find(m.layers, 'outer')?.category).toBe('insulated-jacket');
    expect(m.limitations).not.toContain(LIMITATION.waterproof);
  });
  it('says when no waterproof is recorded', () => {
    const m = matchInventory(req('coat', { rain: 'waterproof' }), { coat: own('medium') });
    expect(m.limitations).toContain(LIMITATION.waterproof);
    expect(find(m.layers, 'outer')?.category).toBe('coat');
  });
  it('adds an owned shell over a band without an outer layer', () => {
    const m = matchInventory(req('two', { rain: 'hood' }), { 'waterproof-jacket': { ...own('thin', 'thick'), nickname: 'blue shell' } });
    expect(m.layers.at(-1)).toMatchObject({ kind: 'outer', label: 'Waterproof', thickness: 'thin', nickname: 'blue shell', owned: 'owned' });
  });
  it('flags a missing shell over a band without an outer layer', () => {
    const m = matchInventory(req('two', { rain: 'waterproof' }), { 'waterproof-jacket': none });
    expect(find(m.layers, 'outer')).toBeUndefined();
    expect(m.limitations).toContain(LIMITATION.waterproof);
  });
  it('leans to windproof outerwear in strong wind', () => {
    const inv: Inventory = { 'light-jacket': { ...own('thin'), wind: 'low' }, 'waterproof-jacket': own('thin') };
    expect(find(matchInventory(req('jacket'), inv).layers, 'outer')?.category).toBe('light-jacket');
    expect(find(matchInventory(req('jacket', { wind: 'high' }), inv).layers, 'outer')?.category).toBe('waterproof-jacket');
  });
});

describe('matchInventory: outerwear details', () => {
  it('carries the nickname, category and thickness', () => {
    const m = matchInventory(req('coat'), { coat: { ...own('medium'), nickname: '  green parka ' } });
    expect(find(m.layers, 'outer')).toMatchObject({ category: 'coat', thickness: 'medium', nickname: 'green parka', owned: 'owned', label: 'Coat' });
  });
  it('ignores a blank nickname', () => {
    expect(find(matchInventory(req('coat'), { coat: { ...own('medium'), nickname: ' ' } }).layers, 'outer')?.nickname).toBeUndefined();
  });
});

describe('matchInventory: bottoms and footwear', () => {
  it('omits both when nothing is set for them', () => {
    const m = matchInventory(req('coat'), { coat: own('medium') });
    expect(find(m.layers, 'bottoms')).toBeUndefined();
    expect(find(m.layers, 'footwear')).toBeUndefined();
  });
  it('picks bottoms for the requirement', () => {
    const inv: Inventory = { shorts: plain, jeans: plain, 'heavy-trousers': plain };
    expect(find(matchInventory(req('tshirt', { bottoms: 'shorts' }), inv).layers, 'bottoms')).toMatchObject({ category: 'shorts', label: 'Shorts', owned: 'owned' });
    expect(find(matchInventory(req('bundle', { bottoms: 'heavy' }), inv).layers, 'bottoms')?.category).toBe('heavy-trousers');
    expect(find(matchInventory(req('two', { bottoms: 'standard' }), inv).layers, 'bottoms')?.category).toBe('jeans');
  });
  it('gives generic bottoms when the fitting ones are unknown', () => {
    const m = matchInventory(req('bundle', { bottoms: 'heavy' }), { shorts: plain });
    expect(find(m.layers, 'bottoms')).toMatchObject({ label: 'Warm trousers', owned: 'unknown' });
  });
  it('says so when no suitable bottoms are owned', () => {
    const m = matchInventory(req('bundle', { bottoms: 'heavy' }), { shorts: plain, jeans: none, 'heavy-trousers': none, 'light-trousers': none });
    expect(find(m.layers, 'bottoms')).toMatchObject({ label: 'Warm trousers', owned: 'none' });
    expect(m.limitations).toContain(LIMITATION.bottoms);
  });
  it('chooses waterproof footwear in the rain', () => {
    const inv: Inventory = { trainers: plain, boots: plain, 'waterproof-shoes': plain };
    expect(find(matchInventory(req('coat', { footwear: 'closed' }), inv).layers, 'footwear')?.category).toBe('trainers');
    expect(find(matchInventory(req('coat', { footwear: 'waterproof' }), inv).layers, 'footwear')?.category).toBe('waterproof-shoes');
    expect(find(matchInventory(req('coat', { footwear: 'boots' }), inv).layers, 'footwear')?.category).toBe('boots');
  });
  it('flags trainers in the rain when nothing waterproof is owned', () => {
    const m = matchInventory(req('coat', { footwear: 'waterproof' }), { trainers: plain, boots: { counts: { medium: 0 } }, 'waterproof-shoes': { counts: { medium: 0 } } });
    expect(find(m.layers, 'footwear')?.category).toBe('trainers');
    expect(m.limitations).toContain(LIMITATION.waterproofFeet);
  });
  it('never suggests sandals for closed shoes', () => {
    const m = matchInventory(req('coat', { footwear: 'closed' }), { sandals: plain, trainers: none, boots: none, 'waterproof-shoes': none });
    expect(find(m.layers, 'footwear')).toMatchObject({ label: 'Closed shoes', owned: 'none' });
    expect(m.limitations).toContain(LIMITATION.footwear);
  });
});

describe('matchInventory: alternatives', () => {
  const full: Inventory = { longsleeve: own('medium'), jumper: own('medium'), fleece: own('medium'), coat: own('medium') };
  it('offers one other combination of owned clothes', () => {
    const m = matchInventory(req('coat'), full);
    expect(m.alternatives).toHaveLength(1);
    const alt = m.alternatives[0];
    expect(alt.every((l) => l.owned === 'owned')).toBe(true);
    expect(alt.map((l) => `${l.category}:${l.thickness}`)).not.toEqual(m.layers.map((l) => `${l.category}:${l.thickness}`));
    expect(find(alt, 'mid')?.category).toBe('fleece');
  });
  it('has none when there is only one way to dress', () => {
    expect(matchInventory(req('coat'), { longsleeve: own('medium'), jumper: own('medium'), coat: own('medium') }).alternatives).toEqual([]);
  });
  it('has none when part of the outfit is generic', () => {
    expect(matchInventory(req('coat'), { jumper: own('medium'), fleece: own('medium'), coat: own('medium') }).alternatives).toEqual([]);
  });
  it('does not offer a colder alternative', () => {
    const m = matchInventory(req('coat'), { longsleeve: own('medium'), jumper: own('medium'), coat: own('medium', 'thin') });
    for (const alt of m.alternatives) expect(upperPoints(alt)).toBeGreaterThanOrEqual(6);
  });
  it('does not offer a drier alternative that is less waterproof', () => {
    const m = matchInventory(req('coat', { rain: 'waterproof' }), { longsleeve: own('medium'), jumper: own('medium'), 'waterproof-jacket': own('medium'), coat: own('medium') });
    for (const alt of m.alternatives) expect(find(alt, 'outer')?.category).toBe('waterproof-jacket');
  });
});

describe('withoutCovered', () => {
  const base: Inventory = { longsleeve: own('medium'), jumper: own('medium') };
  const chips: Extra[] = [
    { id: 'umbrella', label: 'Umbrella', tone: 'rain', reason: '' },
    { id: 'waterproof', label: 'Waterproof', tone: 'rain', reason: '' },
    { id: 'hood', label: 'Hooded waterproof', tone: 'rain', reason: '' },
  ];
  const kept = (band: BandId, inv: Inventory) => {
    const m = matchInventory(req(band, { rain: 'waterproof' }), inv);
    return withoutCovered(chips, m.layers, inv).map((e) => e.id);
  };
  it('drops the waterproof chip when the outer layer is a waterproof', () => {
    expect(kept('coat', { ...base, 'waterproof-jacket': own('medium') })).toEqual(['umbrella', 'hood']);
  });
  it('uses the water resistance the user recorded over the catalogue default', () => {
    expect(kept('coat', { ...base, coat: { ...own('medium'), water: 'waterproof' } })).toEqual(['umbrella', 'hood']);
    expect(kept('coat', { ...base, 'waterproof-jacket': { ...own('medium'), water: 'resistant' } })).toEqual(['umbrella', 'waterproof', 'hood']);
  });
  it('keeps it with a showerproof or ordinary coat', () => {
    expect(kept('coat', { ...base, 'insulated-jacket': own('medium') })).toContain('waterproof');
    expect(kept('coat', { ...base, coat: own('medium') })).toContain('waterproof');
  });
  it('drops it for a shell worn over a band without an outer layer', () => {
    expect(kept('two', { ...base, 'waterproof-jacket': own('thin') })).toEqual(['umbrella', 'hood']);
  });
  it('keeps it with generic advice', () => {
    expect(kept('coat', {})).toContain('waterproof');
  });
});

describe('advise: redundant chips', () => {
  const soaking = day(3, () => ({ feels: 5, precipProb: 80, precip: 1 }));
  const inv: Inventory = { longsleeve: own('medium'), jumper: own('medium'), 'waterproof-jacket': own('medium') };
  const ids = (a: ReturnType<typeof advise>) => a!.extras.map((e) => e.id);
  it('drops the waterproof chip when a waterproof is already in the list', () => {
    expect(ids(advise({ hours: soaking, activity: 'walking' }))).toContain('waterproof');
    expect(ids(advise({ hours: soaking, activity: 'walking', inventory: inv }))).not.toContain('waterproof');
  });
  it('keeps the umbrella chip alongside it', () => {
    expect(ids(advise({ hours: soaking, activity: 'walking', inventory: inv }))).toContain('umbrella');
  });
  it('keeps the hood chip, since hoods are not recorded', () => {
    const gusty = day(3, () => ({ feels: 5, precipProb: 80, precip: 1, gusts: 60 }));
    expect(ids(advise({ hours: gusty, activity: 'walking', inventory: inv }))).toContain('hood');
  });
});

describe('matchInventory: learned garment warmth (US-039)', () => {
  const wardrobe: Inventory = { longsleeve: own('medium'), jumper: own('thin', 'medium', 'thick'), coat: own('medium', 'thick') };
  const picks = (m: ReturnType<typeof matchInventory>) => m.layers.filter((l) => l.thickness).map((l) => `${l.category}:${l.thickness}`);

  it('changes nothing when nothing is learned', () => {
    for (const b of ['two', 'jacket', 'coat', 'bundle'] as const) {
      expect(matchInventory(req(b), wardrobe, {})).toEqual(matchInventory(req(b), wardrobe));
    }
  });
  it('reaches for a thicker jumper once the usual one runs cool', () => {
    expect(picks(matchInventory(req('two'), wardrobe))).toEqual(['longsleeve:medium', 'jumper:medium']);
    expect(picks(matchInventory(req('two'), wardrobe, { 'jumper:medium': -1 }))).toEqual(['longsleeve:medium', 'jumper:thick']);
  });
  it('lets a coat that runs warm stand in for a heavier one', () => {
    expect(picks(matchInventory(req('bundle'), wardrobe))).toContain('coat:thick');
    expect(picks(matchInventory(req('bundle'), wardrobe, { 'coat:medium': 1 }))).toContain('coat:medium');
  });
  it('stops counting on a heavy coat that runs cool', () => {
    expect(picks(matchInventory(req('bundle'), wardrobe, { 'coat:thick': -1 }))).toContain('coat:medium');
  });
  it('trims layers after "too many layers"', () => {
    expect(picks(matchInventory(req('jacket'), wardrobe))).toContain('jumper:medium');
    expect(picks(matchInventory(req('jacket'), wardrobe, { layers: -0.5 }))).toContain('jumper:thin');
  });
  it('ignores learned warmth for garments not owned', () => {
    expect(matchInventory(req('two'), wardrobe, { 'fleece:thick': 1 })).toEqual(matchInventory(req('two'), wardrobe));
  });
  it('is passed through advise', () => {
    const mild = day(3, () => ({ feels: 13 }));
    const base = advise({ hours: mild, activity: 'walking', inventory: wardrobe })!;
    const learned = advise({ hours: mild, activity: 'walking', inventory: wardrobe, garmentWarmth: { 'jumper:medium': -1 } })!;
    expect(base.requirements!.band).toBe('two');
    expect(learned.effective).toBe(base.effective);
    expect(base.layers.find((l) => l.kind === 'mid')?.thickness).toBe('medium');
    expect(learned.layers.find((l) => l.kind === 'mid')?.thickness).toBe('thick');
  });
});

// #92: with the thermal model on, the matched outfit adds up to the target in clo (thermal-model §9.2).
describe('matchInventory: matching in clo', () => {
  // Everything in the catalogue in every thickness, as the golden days use.
  const COMPLETE: Inventory = Object.fromEntries(CATALOGUE.map((c) => [c.id, { counts: c.thickness ? { thin: 1, medium: 1, thick: 1 } : { medium: 1 } }]));
  const target = (icl: number): ClothingTarget => ({ icl, floor: icl, neutral: icl, bias: 0, exposureHours: 0.5, basis: 'ireq' });
  const inClo = (band: BandId, icl: number, over: Partial<Requirements> = {}) => req(band, { clo: target(icl), ...over });
  const basic = (ls: LayerAdvice[]) =>
    ensembleClo(ls.filter((l) => l.category && !l.optional).map((l) => ({ category: l.category!, thickness: l.thickness })), 0, { walk: 0, ride: 0 }, 'dry').basic;
  const picks = (m: ReturnType<typeof matchInventory>) => m.layers.filter((l) => l.thickness).map((l) => `${l.category}:${l.thickness}`);
  const ranges: [BandId, number[]][] = [
    ['tshirt', [0.36, 0.45]],
    ['light', [0.55, 0.65]],
    ['two', [0.75, 0.9]],
    ['jacket', [1, 1.2]],
    ['coat', [1.3, 1.45]],
    ['bundle', [1.55, 1.65]],
  ];

  it('reaches the target from a complete wardrobe, less 0.1 clo at most, without going far over', () => {
    for (const [band, icls] of ranges) for (const icl of icls) {
      const sum = basic(matchInventory(inClo(band, icl), COMPLETE).layers);
      expect(sum, `${band} ${icl}`).toBeGreaterThanOrEqual(icl - 0.1);
      expect(sum, `${band} ${icl}`).toBeLessThanOrEqual(icl + 0.25);
    }
  });

  it('dresses warmer for a higher target in the same band', () => {
    expect(basic(matchInventory(inClo('coat', 1.45), COMPLETE).layers)).toBeGreaterThan(basic(matchInventory(inClo('coat', 1.3), COMPLETE).layers));
  });

  it('picks the closest outfit from a partial wardrobe and says when it falls short', () => {
    const wardrobe: Inventory = { longsleeve: own('medium'), jumper: own('thin', 'medium'), coat: own('thin', 'medium'), jeans: plain, trainers: plain };
    // The warmest of these sums to about 1.38 clo.
    const m = matchInventory(inClo('coat', 1.7), wardrobe);
    expect(picks(m)).toEqual(['longsleeve:medium', 'jumper:medium', 'coat:medium']);
    expect(m.limitations).toContain(LIMITATION.shortfall);
    expect(matchInventory(inClo('coat', 1.3), wardrobe).limitations).not.toContain(LIMITATION.shortfall);
  });

  it('still prefers a waterproof outer and carries its nickname', () => {
    const wardrobe: Inventory = { ...COMPLETE, 'waterproof-jacket': { counts: { thin: 0, medium: 0, thick: 1 }, nickname: 'Blue mac' } };
    const outer = find(matchInventory(inClo('coat', 1.38, { rain: 'waterproof', footwear: 'waterproof' }), wardrobe).layers, 'outer');
    expect(outer).toMatchObject({ category: 'waterproof-jacket', thickness: 'thick', nickname: 'Blue mac' });
  });

  it('offers alternatives that reach the target too', () => {
    const wardrobe: Inventory = { longsleeve: own('medium'), jumper: own('medium'), fleece: own('medium'), coat: own('medium'), jeans: plain, trainers: plain };
    const m = matchInventory(inClo('coat', 1.38), wardrobe);
    expect(m.alternatives).toHaveLength(1);
    expect(basic(m.alternatives[0])).toBeGreaterThanOrEqual(1.28);
  });

  it('uses learned garment warmth and the "too many layers" trim', () => {
    const wardrobe: Inventory = { longsleeve: own('medium'), jumper: own('thin', 'medium', 'thick'), coat: own('medium'), jeans: plain, trainers: plain };
    expect(picks(matchInventory(inClo('coat', 1.38), wardrobe))).toContain('jumper:medium');
    expect(picks(matchInventory(inClo('coat', 1.38), wardrobe, { 'jumper:medium': -1 }))).toContain('jumper:thick');
    // A medium jumper falls a little short of 1.42; the trim brings the target down to it.
    expect(picks(matchInventory(inClo('coat', 1.42), wardrobe))).toContain('jumper:thick');
    expect(picks(matchInventory(inClo('coat', 1.42), wardrobe, { layers: -0.5 }))).toContain('jumper:medium');
  });

  it('turns a point of learned warmth into about one thickness step', () => {
    expect(CLO_PER_POINT).toBeGreaterThan(0.1);
    expect(CLO_PER_POINT).toBeLessThan(0.15);
  });
});
