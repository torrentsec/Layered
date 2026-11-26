// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import { headsUps } from '../headsups';
import { airChips, level } from '../air';
import { packingList, packingText } from '../packing';
import { notificationText } from '../notify';
import type { Hour, WardrobeItem } from '../types';
import { day } from './fixtures';

const a = (hours: Hour[], wardrobe: WardrobeItem[] = []) => advise({ hours, activity: 'walking', wardrobe })!;

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

describe('wardrobe', () => {
  const items: WardrobeItem[] = [
    { id: '1', name: 'Navy puffer', layer: 'outer', warmth: 4, waterproof: false, windproof: true },
    { id: '2', name: 'Yellow mac', layer: 'outer', warmth: 2, waterproof: true, windproof: true },
    { id: '3', name: 'Grey merino', layer: 'mid', warmth: 3, waterproof: false, windproof: false },
    { id: '4', name: 'Black beanie', layer: 'accessory', warmth: 2, waterproof: false, windproof: false },
  ];
  it('picks the outer layer whose warmth fits', () => {
    expect(a(day(2, () => ({ feels: 4 })), items).layers.find((l) => l.kind === 'outer')?.item?.name).toBe('Navy puffer');
    expect(a(day(2, () => ({ feels: 9 })), items).layers.find((l) => l.kind === 'outer')?.item?.name).toBe('Yellow mac');
  });
  it('prefers a waterproof when rain is likely', () => {
    const wax: WardrobeItem = { id: '5', name: 'Wax jacket', layer: 'outer', warmth: 3, waterproof: true, windproof: true };
    const dry = a(day(2, () => ({ feels: 5 })), [...items, wax]);
    expect(dry.layers.find((l) => l.kind === 'outer')?.item?.name).toBe('Navy puffer');
    const wet = a(day(2, () => ({ feels: 5, precipProb: 80 })), [...items, wax]);
    expect(wet.layers.find((l) => l.kind === 'outer')?.item?.name).toBe('Wax jacket');
    expect(wet.extras.map((e) => e.id)).not.toContain('waterproof');
  });
  it('keeps a warm coat over a thin waterproof, and still says waterproof', () => {
    const adv = a(day(2, () => ({ feels: 5, precipProb: 80 })), items);
    expect(adv.layers.find((l) => l.kind === 'outer')?.item?.name).toBe('Navy puffer');
    expect(adv.extras.map((e) => e.id)).toContain('waterproof');
  });
  it('adds a shell when the band has no outer layer', () => {
    const adv = a(day(2, () => ({ feels: 14, precipProb: 80 })), items);
    expect(adv.layers.at(-1)?.item?.name).toBe('Yellow mac');
  });
  it('names matching accessories', () => {
    expect(a(day(2, () => ({ feels: 1 })), items).extras.find((e) => e.id === 'hat')?.item?.name).toBe('Black beanie');
  });
  it('falls back to generic advice when nothing fits', () => {
    const adv = a(day(2, () => ({ feels: -5 })), [items[1]]);
    expect(adv.layers.find((l) => l.kind === 'outer')?.item).toBeUndefined();
  });
  it('works with an empty wardrobe', () => {
    expect(a(day(2, () => ({ feels: 4 }))).layers.every((l) => !l.item)).toBe(true);
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
