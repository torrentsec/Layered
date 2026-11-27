// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import { headsUps } from '../headsups';
import { airChips, level } from '../air';
import { packingList, packingText } from '../packing';
import { notificationText } from '../notify';
import type { Hour } from '../types';
import type { Inventory } from '../inventory';
import { bandFor } from '../bands';
import { day } from './fixtures';

const a = (hours: Hour[], inventory: Inventory = {}) => advise({ hours, activity: 'walking', inventory })!;

describe('heads-ups', () => {
  const id = (h: Hour[]) => headsUps(h).map((x) => x.id);
  it('ice with precipitation near freezing', () => expect(id(day(2, () => ({ temp: 1, precip: 0.2 })))).toContain('ice'));
  it('ice when it freezes after rain', () => {
    expect(id(day(4, (i) => (i < 2 ? { temp: 3, precip: 1 } : { temp: 0 })))).toContain('ice');
    expect(id(day(4, () => ({ temp: 0 })))).not.toContain('ice');
  });
  it('storm from 70 km/h gusts', () => {
    expect(id(day(2, () => ({ gusts: 69 })))).not.toContain('storm');
    expect(id(day(2, () => ({ gusts: 70 })))).toContain('storm');
  });
  it('extreme UV from 8', () => expect(id(day(2, () => ({ uv: 8 })))).toContain('uv'));
  it('heat from 28° feels-like', () => expect(id(day(2, () => ({ feels: 28 })))).toContain('heat'));
  it('fog by code or visibility', () => {
    expect(id(day(2, () => ({ code: 45 })))).toContain('fog');
    expect(id(day(2, () => ({ visibility: 500 })))).toContain('fog');
    expect(id(day(2))).toEqual([]);
  });
});

describe('air', () => {
  it('bands values', () => {
    expect(level(29, [30, 50, 150])).toBe('low');
    expect(level(30, [30, 50, 150])).toBe('moderate');
    expect(level(150, [30, 50, 150])).toBe('very high');
  });
  it('shows only moderate or worse', () => {
    expect(airChips({ grass: 10, tree: 5, aqi: 20 })).toEqual([]);
    expect(airChips({ grass: 60, aqi: 65 }).map((c) => c.label)).toEqual(['Grass pollen high', 'Air quality poor']);
  });
});

describe('packing', () => {
  const warm = a(day(3, () => ({ feels: 24, uv: 7 })));
  const cold = a(day(3, () => ({ feels: 4, precipProb: 70 })));
  const bitter = a(day(3, () => ({ feels: -3 })));

  it('counts tops per day, capped at a week', () => {
    expect(packingList([warm, warm, warm]).find((i) => i.id === 'tshirt')?.qty).toBe(3);
    expect(packingList(Array(10).fill(warm)).find((i) => i.id === 'tshirt')?.qty).toBe(7);
  });
  it('re-wears jumpers every three days', () => {
    const list = packingList(Array(7).fill(cold));
    expect(list.find((i) => i.id === 'mid')?.qty).toBe(3);
    expect(packingList([cold, cold]).find((i) => i.id === 'mid')?.qty).toBe(1);
  });
  it('packs one outer layer sized for the coldest day', () => {
    const list = packingList([warm, cold, bitter]);
    expect(list.filter((i) => i.kind === 'outer' && i.id === 'outer')).toHaveLength(1);
    expect(list.find((i) => i.id === 'outer')?.label).toBe('Heavy coat (waterproof if you have one)');
    expect(list.find((i) => i.id === 'thermal')?.qty).toBe(1);
  });
  it('adds accessories when any day needs them', () => {
    const ids = packingList([warm, cold, bitter]).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['umbrella', 'sunscreen', 'sunglasses', 'gloves', 'hat', 'scarf', 'waterproof']));
  });
  it('a light waterproof for warm wet trips', () => {
    const wetWarm = a(day(3, () => ({ feels: 23, precipProb: 80 })));
    expect(packingList([wetWarm]).find((i) => i.id === 'outer')?.label).toBe('Light waterproof jacket');
  });
  it('is empty for no days', () => expect(packingList([])).toEqual([]));
  it('renders shareable text', () => {
    const text = packingText('Lisbon', [{ id: 'tshirt', label: 'T-shirts', qty: 3, kind: 'base' }], { tshirt: true });
    expect(text).toBe('Lisbon\n\n[x] T-shirts × 3');
  });
});

describe('inventory in advice', () => {
  const inv: Inventory = {
    'insulated-jacket': { counts: { medium: 1, thin: 0, thick: 0 }, nickname: 'navy puffer', water: 'none' },
    'waterproof-jacket': { counts: { thin: 1, medium: 0, thick: 0 }, nickname: 'yellow mac' },
    jumper: { counts: { thin: 0, medium: 1, thick: 1 } },
  };
  const outer = (adv: ReturnType<typeof a>) => adv.layers.find((l) => l.kind === 'outer');
  it('picks the outer layer whose thickness fits', () => {
    expect(outer(a(day(2, () => ({ feels: 4 })), inv))?.nickname).toBe('navy puffer');
    expect(outer(a(day(2, () => ({ feels: 9 })), inv))?.nickname).toBe('yellow mac');
  });
  it('trades a thicker jumper for a waterproof shell in the rain', () => {
    const wet = a(day(2, () => ({ feels: 5, precipProb: 80 })), inv);
    expect(outer(wet)?.category).toBe('waterproof-jacket');
    expect(wet.layers.find((l) => l.kind === 'mid')?.thickness).toBe('thick');
  });
  it('adds a shell when the band has no outer layer', () => {
    expect(a(day(2, () => ({ feels: 14, precipProb: 80 })), inv).layers.find((l) => l.kind === 'outer')?.nickname).toBe('yellow mac');
  });
  it('drops the umbrella when you have none', () => {
    const wet = day(2, () => ({ feels: 14, precipProb: 40 }));
    expect(a(wet).extras.map((e) => e.id)).toContain('umbrella');
    expect(a(wet, { umbrella: { counts: { medium: 0 } } }).extras.map((e) => e.id)).not.toContain('umbrella');
  });
  it('fills requirements and comfort offset', () => {
    const adv = advise({ hours: day(2, () => ({ feels: 10 })), activity: 'walking', comfort: { sensitivity: 'cold' } })!;
    expect(adv.why.comfortOffset).toBe(-2);
    expect(adv.effective).toBe(8);
    expect(adv.requirements?.band).toBe('jacket');
    expect(adv.limitations).toEqual([]);
  });
  it('keeps generic layers with an empty inventory', () => {
    for (const feels of [-5, 4, 9, 14, 19, 25]) {
      const adv = a(day(2, () => ({ feels })));
      expect(adv.layers.map(({ kind, label, optional }) => ({ kind, label, optional }))).toEqual(
        bandFor(adv.effective).layers.map(({ kind, label, optional }) => ({ kind, label, optional })),
      );
      expect(adv.layers.every((l) => l.owned === 'unknown' && !l.category)).toBe(true);
      expect(adv.alternatives).toEqual([]);
    }
  });
});

describe('notification text', () => {
  it('summarises outfit and rain timing', () => {
    const hours = day(12, (i) => ({ feels: 5, ...(i >= 8 ? { precipProb: 60, code: 80, precip: 0.4 } : {}) }));
    const adv = a(hours.slice(0, 2));
    expect(notificationText({ ...adv, extras: [...adv.extras, { id: 'umbrella', label: 'Umbrella', tone: 'rain', reason: '' }] }, hours)).toBe(
      'Coat + umbrella today · showers from 16:00',
    );
  });
  it('says dry when it is', () => {
    const hours = day(4, () => ({ feels: 24 }));
    expect(notificationText(a(hours), hours)).toBe('T-shirt today · dry');
  });
});
