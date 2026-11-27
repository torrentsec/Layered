// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { choiceOptions, fromWardrobe, genericName, insulationWords, layerText, needsRows } from './advice-text';
import { insulationPoints, layerPlan, requirementsFor } from '../engine/requirements';
import type { LayerAdvice, WardrobeItem } from '../engine/types';

const item: WardrobeItem = { id: 'w1', name: 'Grey Hoodie', layer: 'mid', warmth: 2, waterproof: false, windproof: false };

describe('layerText', () => {
  it('keeps the plain label when the engine gives no inventory detail', () => {
    expect(layerText({ kind: 'mid', label: 'Jumper or fleece' })).toEqual({ title: 'Jumper or fleece', general: false });
  });

  it('names thickness and category in words', () => {
    expect(layerText({ kind: 'mid', label: 'Mid layer', category: 'jumper', thickness: 'medium' }).title).toBe('Medium jumper');
    expect(genericName({ kind: 'outer', label: 'Coat', category: 'coat', thickness: 'thick' })).toBe('Thick coat');
  });

  it('falls back to the label for categories without thickness', () => {
    expect(genericName({ kind: 'footwear', label: 'Boots', category: 'boots', thickness: 'medium' })).toBe('Boots');
  });

  it('leads with the nickname and keeps the generic name underneath', () => {
    const l: LayerAdvice = { kind: 'outer', label: 'Coat', category: 'coat', thickness: 'medium', nickname: 'green parka', owned: 'owned' };
    expect(layerText(l)).toEqual({ title: 'Your green parka', sub: 'Medium coat', general: false });
  });

  it('keeps legacy wardrobe items as before', () => {
    expect(layerText({ kind: 'mid', label: 'Warm mid layer', item })).toEqual({ title: 'Your grey hoodie', sub: 'Warm mid layer', general: false });
  });

  it('marks unmatched rows as general advice', () => {
    expect(layerText({ kind: 'base', label: 'T-shirt', owned: 'unknown' }).general).toBe(true);
  });
});

describe('fromWardrobe', () => {
  it('counts owned and legacy items, not unknown or unset ones', () => {
    expect(fromWardrobe({ kind: 'base', label: 'x', owned: 'owned' })).toBe(true);
    expect(fromWardrobe({ kind: 'base', label: 'x', item })).toBe(true);
    expect(fromWardrobe({ kind: 'base', label: 'x', owned: 'unknown' })).toBe(false);
    expect(fromWardrobe({ kind: 'base', label: 'x' })).toBe(false);
  });
});

describe('insulationWords', () => {
  it('matches each band to a word', () => {
    const word = (b: Parameters<typeof layerPlan>[0]) => insulationWords(insulationPoints(layerPlan(b)));
    expect(word('tshirt')).toBe('Very little');
    expect(word('light')).toBe('A little');
    expect(word('two')).toBe('Moderate');
    expect(word('jacket')).toBe('Moderate');
    expect(word('coat')).toBe('Warm');
    expect(word('bundle')).toBe('Very warm');
  });
});

describe('needsRows', () => {
  it('describes a wet, windy cold day in plain words', () => {
    // 4.5° sits mid-band, clear of the edge hedge that would add a "Layers" row.
    const r = requirementsFor({
      effective: 4.5,
      band: 'coat',
      stats: { maxGust: 50, maxWind: 20 } as never,
      extras: [{ id: 'waterproof', label: '', tone: 'rain', reason: '' }],
      activity: 'walking',
    });
    expect(needsRows(r)).toEqual([
      { label: 'Warmth', value: 'Warm' },
      { label: 'Rain', value: 'A waterproof layer' },
      { label: 'Wind', value: 'Fully windproof' },
      { label: 'Legs', value: 'Heavy trousers' },
      { label: 'Feet', value: 'Waterproof shoes' },
    ]);
  });

  it('adds a row when layers should come off easily', () => {
    const r = requirementsFor({ effective: 12, band: 'jacket', stats: { maxGust: 10, maxWind: 5 } as never, extras: [{ id: 'swing', label: '', tone: 'info', reason: '' }], activity: 'walking' });
    expect(needsRows(r).at(-1)).toEqual({ label: 'Layers', value: 'Easy to take off' });
  });
});

describe('choiceOptions', () => {
  it('has nothing to switch without alternatives', () => {
    expect(choiceOptions(0)).toHaveLength(1);
  });

  it('labels one or two alternatives and caps at two', () => {
    expect(choiceOptions(1).map((o) => o.label)).toEqual(['Suggested', 'Alternative']);
    expect(choiceOptions(5).map((o) => o.label)).toEqual(['Suggested', 'Alternative 1', 'Alternative 2']);
  });
});
