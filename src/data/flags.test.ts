// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { activeFlags, FLAGS_KEY, parseFlags } from './flags';

function memory(initial?: string) {
  const m = new Map<string, string>(initial === undefined ? [] : [[FLAGS_KEY, initial]]);
  return {
    m,
    storage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    },
  };
}

describe('flags', () => {
  it('keeps only known names', () => {
    expect([...parseFlags(' feels-in-clothes ,nope,')]).toEqual(['feels-in-clothes']);
    expect(parseFlags(null).size).toBe(0);
  });

  it('is off with no URL and nothing remembered', () => {
    expect(activeFlags({ search: '', storage: memory().storage }).size).toBe(0);
    expect(activeFlags(undefined).size).toBe(0);
  });

  it('turns on from the URL and remembers it', () => {
    const s = memory();
    expect(activeFlags({ search: '?flags=feels-in-clothes', storage: s.storage }).has('feels-in-clothes')).toBe(true);
    expect(s.m.get(FLAGS_KEY)).toBe('feels-in-clothes');
    expect(activeFlags({ search: '', storage: s.storage }).has('feels-in-clothes')).toBe(true);
  });

  it('an empty list turns everything off', () => {
    const s = memory('feels-in-clothes');
    expect(activeFlags({ search: '?flags=', storage: s.storage }).size).toBe(0);
    expect(s.m.has(FLAGS_KEY)).toBe(false);
  });

  it('still honours the URL when storage throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(activeFlags({ search: '?flags=feels-in-clothes', storage: broken }).has('feels-in-clothes')).toBe(true);
    expect(activeFlags({ search: '', storage: broken }).size).toBe(0);
  });
});
