// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { WardrobeItem } from '../engine/types';
import { ownership } from '../engine/inventory';
import { categoryFor, migrateWardrobe, thicknessFor } from './migrate';

let n = 0;
const item = (p: Partial<WardrobeItem>): WardrobeItem => ({ id: String(n++), name: '', layer: 'outer', warmth: 3, waterproof: false, windproof: false, ...p });

describe('thicknessFor', () => {
  it('maps warmth 1–2 thin, 3 medium, 4–5 thick', () => {
    expect([1, 2, 3, 4, 5].map(thicknessFor)).toEqual(['thin', 'thin', 'medium', 'thick', 'thick']);
  });
});

describe('categoryFor', () => {
  it('reads names first', () => {
    expect(categoryFor(item({ name: 'Navy puffer' }))).toBe('insulated-jacket');
    expect(categoryFor(item({ name: 'Rain mac' }))).toBe('waterproof-jacket');
    expect(categoryFor(item({ name: 'Wool overcoat' }))).toBe('coat');
    expect(categoryFor(item({ name: 'Denim jacket' }))).toBe('light-jacket');
    expect(categoryFor(item({ name: 'Grey hoodie', layer: 'mid' }))).toBe('hoodie');
    expect(categoryFor(item({ name: 'Merino top', layer: 'base' }))).toBe('thermal');
    expect(categoryFor(item({ name: 'White tee', layer: 'base' }))).toBe('tshirt');
    expect(categoryFor(item({ name: 'Brolly', layer: 'accessory' }))).toBe('umbrella');
    expect(categoryFor(item({ name: 'Beanie', layer: 'accessory' }))).toBe('hat');
    expect(categoryFor(item({ name: 'Walking boots', layer: 'accessory' }))).toBe('boots');
    expect(categoryFor(item({ name: 'Gore-Tex shoes', layer: 'accessory', waterproof: true }))).toBe('waterproof-shoes');
  });
  it('falls back on layer, warmth and flags', () => {
    expect(categoryFor(item({ name: 'Old faithful' }))).toBe('light-jacket');
    expect(categoryFor(item({ name: 'Old faithful', warmth: 5 }))).toBe('insulated-jacket');
    expect(categoryFor(item({ name: 'Old faithful', waterproof: true }))).toBe('waterproof-jacket');
    expect(categoryFor(item({ name: 'Blue one', layer: 'mid' }))).toBe('jumper');
    expect(categoryFor(item({ name: 'Plain', layer: 'base', warmth: 1 }))).toBe('tshirt');
    expect(categoryFor(item({ name: 'Plain', layer: 'base', warmth: 3 }))).toBe('longsleeve');
    expect(categoryFor(item({ name: 'Plain', layer: 'base', warmth: 5 }))).toBe('thermal');
  });
  it('skips accessories it cannot place', () => {
    expect(categoryFor(item({ name: 'Sunglasses', layer: 'accessory' }))).toBeUndefined();
  });
});

describe('migrateWardrobe', () => {
  it('counts items by category and thickness', () => {
    const inv = migrateWardrobe([
      item({ name: 'Fine knit jumper', layer: 'mid', warmth: 2 }),
      item({ name: 'Chunky jumper', layer: 'mid', warmth: 5 }),
      item({ name: 'Cable jumper', layer: 'mid', warmth: 4 }),
    ]);
    expect(inv.jumper?.counts).toEqual({ thin: 1, thick: 2 });
    expect(ownership(inv, 'jumper', 'medium')).toBe('unknown');
  });
  it('uses one medium count for categories without thickness', () => {
    expect(migrateWardrobe([item({ name: 'Gloves', layer: 'accessory', warmth: 5 })]).gloves?.counts).toEqual({ medium: 1 });
  });
  it('carries flags and the outer name as nickname', () => {
    const inv = migrateWardrobe([item({ name: '  Navy puffer ', warmth: 4, waterproof: true, windproof: true })]);
    expect(inv['insulated-jacket']).toEqual({ counts: { thick: 1 }, water: 'waterproof', wind: 'high', nickname: 'Navy puffer' });
  });
  it('never turns an unticked flag into a "none"', () => {
    const e = migrateWardrobe([item({ name: 'Denim jacket' })])['light-jacket'];
    expect(e).toEqual({ counts: { medium: 1 }, nickname: 'Denim jacket' });
  });
  it('keeps the first nickname and gives none to inner layers', () => {
    const inv = migrateWardrobe([item({ name: 'Navy puffer' }), item({ name: 'Black puffer' }), item({ name: 'Red jumper', layer: 'mid' })]);
    expect(inv['insulated-jacket']?.nickname).toBe('Navy puffer');
    expect(inv.jumper?.nickname).toBeUndefined();
  });
  it('merges into an existing inventory without overriding it', () => {
    const into = { 'insulated-jacket': { counts: { medium: 2, thin: 0 }, nickname: 'big coat', water: 'resistant' as const }, boots: { counts: { medium: 0 } } };
    const inv = migrateWardrobe([item({ name: 'Puffer', warmth: 3, waterproof: true }), item({ name: 'Puffer two', warmth: 1 })], into);
    expect(inv['insulated-jacket']).toEqual({ counts: { medium: 2, thin: 1 }, nickname: 'big coat', water: 'resistant' });
    expect(inv.boots).toEqual({ counts: { medium: 0 } });
    expect(into['insulated-jacket'].counts).toEqual({ medium: 2, thin: 0 });
  });
  it('is idempotent when run over its own result', () => {
    const items = [item({ name: 'Navy puffer', warmth: 4 }), item({ name: 'Grey jumper', layer: 'mid' })];
    const once = migrateWardrobe(items);
    expect(migrateWardrobe(items, once)).toEqual(once);
  });
  it('returns the inventory untouched for an empty wardrobe', () => {
    const into = { hat: { counts: { medium: 1 } } };
    expect(migrateWardrobe([], into)).toEqual(into);
  });
});
