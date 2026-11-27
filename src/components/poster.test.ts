// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { fitText, FOOTER_TOP, layoutPoster, POSTER_W, posterFilename, wrapText, type Measure, type PosterData } from './poster';

// Monospaced stand-in: every character is half the font size wide.
const measure: Measure = (t, f) => t.length * Number(/(\d+)px/.exec(f)![1]) * 0.5;
const at = (size: number) => `500 ${size}px Jost`;

const day: PosterData = {
  place: 'London',
  dateLabel: 'Thu 26 Nov',
  feelsLabel: 'Feels 3° / 9°',
  verdict: 'Coat weather',
  layers: [
    { kind: 'base', label: 'Long-sleeve top' },
    { kind: 'mid', label: 'Jumper' },
    { kind: 'outer', label: 'Warm coat' },
    { kind: 'bottoms', label: 'Trousers' },
    { kind: 'footwear', label: 'Closed shoes' },
  ],
  feels: 4,
  rain: 70,
};

describe('wrapText', () => {
  it('keeps short text on one line', () => {
    expect(wrapText('Coat weather', 1000, measure, at(20))).toEqual(['Coat weather']);
  });

  it('breaks between words at the width', () => {
    // 10px per char: 'one two' = 70, 'one two three' = 130.
    expect(wrapText('one two three four', 100, measure, at(20))).toEqual(['one two', 'three four']);
  });

  it('collapses extra whitespace', () => {
    expect(wrapText('  a   b  ', 1000, measure, at(20))).toEqual(['a b']);
  });

  it('breaks a word longer than the line by characters', () => {
    const lines = wrapText('Llanfairpwllgwyngyll', 60, measure, at(20));
    expect(lines.every((l) => measure(l, at(20)) <= 60)).toBe(true);
    expect(lines.join('')).toBe('Llanfairpwllgwyngyll');
  });

  it('returns nothing for empty text', () => {
    expect(wrapText('   ', 100, measure, at(20))).toEqual([]);
  });
});

describe('fitText', () => {
  it('uses the largest size that fits the line budget', () => {
    // 'Bundle up' is 9 chars: 96px → 432 wide, fits 520 on one line.
    expect(fitText('Bundle up', 520, 1, [96, 72], at, measure)).toEqual({ size: 96, lines: ['Bundle up'] });
  });

  it('steps down a size when the text would need too many lines', () => {
    const r = fitText('Thermals and a big warm coat', 520, 2, [96, 72, 60], at, measure);
    expect(r.size).toBe(72);
    expect(r.lines.length).toBeLessThanOrEqual(2);
  });

  it('clamps with an ellipsis at the smallest size', () => {
    const r = fitText('a b c d e f g h i j k l m n o p', 40, 2, [20], at, measure);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].endsWith('…')).toBe(true);
    expect(r.lines.every((l) => measure(l, at(20)) <= 40)).toBe(true);
  });
});

describe('layoutPoster', () => {
  const widthOf = (t: { text: string; font: string }) => measure(t.text, t.font);

  it('keeps every line inside the side margins', () => {
    const long = { ...day, place: 'Royal Borough of Kensington and Chelsea', verdict: 'Thermals, a big coat and every scarf you own' };
    for (const t of layoutPoster(long, measure).text) {
      expect(t.x).toBeGreaterThanOrEqual(72);
      expect(t.x + widthOf(t)).toBeLessThanOrEqual(POSTER_W - 72);
    }
  });

  it('keeps body copy above the footer rule, even with a long outfit', () => {
    const many = { ...day, layers: Array.from({ length: 9 }, (_, i) => ({ kind: 'mid' as const, label: `Layer number ${i} with a long name` })) };
    expect(layoutPoster(day, measure).bottom).toBeLessThan(FOOTER_TOP);
    expect(layoutPoster(many, measure).bottom).toBeLessThan(FOOTER_TOP);
  });

  it('draws one mark per layer, in order', () => {
    expect(layoutPoster(day, measure).marks.map((m) => m.kind)).toEqual(['base', 'mid', 'outer', 'bottoms', 'footwear']);
  });

  it('includes the place, date, feels range, verdict and wordmark', () => {
    const all = layoutPoster(day, measure).text.map((t) => t.text);
    expect(all).toEqual(expect.arrayContaining(['London', 'Thu 26 Nov', 'Feels 3° / 9°', 'layered']));
    expect(all.join(' ')).toContain('Coat weather');
  });
});

describe('posterFilename', () => {
  it('names the file after the local date', () => {
    expect(posterFilename('2026-11-26')).toBe('layered-2026-11-26.png');
  });
});
