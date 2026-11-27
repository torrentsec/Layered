// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { docTitle } from './doc-title';

describe('docTitle', () => {
  it('keeps the bare name on Today', () => {
    expect(docTitle('today')).toBe('Layered');
  });

  it('names each other section first', () => {
    expect(docTitle('week')).toBe('Week · Layered');
    expect(docTitle('trip')).toBe('Trips · Layered');
    expect(docTitle('wardrobe')).toBe('Wardrobe · Layered');
    expect(docTitle('settings')).toBe('Settings · Layered');
  });

  it('falls back to the bare name for unknown routes', () => {
    expect(docTitle('nope')).toBe('Layered');
  });
});
