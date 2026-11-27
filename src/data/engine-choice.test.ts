// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { DEFAULT_ENGINE, engineOf } from './engine-choice';

describe('engineOf', () => {
  it('defaults to the thermal model', () => {
    expect(DEFAULT_ENGINE).toBe('science');
    expect(engineOf({})).toBe('science');
    expect(engineOf(undefined)).toBe('science');
    expect(engineOf(null)).toBe('science');
  });

  it('keeps an explicit choice', () => {
    expect(engineOf({ engine: 'science' })).toBe('science');
    expect(engineOf({ engine: 'bands' })).toBe('bands');
  });

  it('treats unknown values as the default', () => {
    expect(engineOf({ engine: 'Bands' })).toBe('science');
    expect(engineOf({ engine: 42 })).toBe('science');
  });
});
