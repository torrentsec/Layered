// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { budgetFailures, fixtureForecast, medianScores } from '../scripts/lighthouse';

describe('lighthouse budgets', () => {
  const budgets = JSON.parse(readFileSync('lighthouse-budgets.json', 'utf8')) as Record<string, number>;

  it('holds the release targets', () => {
    expect(budgets).toEqual({ performance: 0.9, accessibility: 0.95, 'best-practices': 0.9 });
  });

  it('passes at the threshold and fails just below it', () => {
    expect(budgetFailures({ performance: 0.9, accessibility: 0.95, 'best-practices': 0.9 }, budgets)).toEqual([]);
    expect(budgetFailures({ performance: 0.89, accessibility: 0.95, 'best-practices': 0.9 }, budgets)).toEqual([
      'performance: 89 < 90',
    ]);
  });

  it('fails a category Lighthouse did not score', () => {
    expect(budgetFailures({ performance: 1, 'best-practices': 1 }, budgets)).toEqual(['accessibility: not scored < 95']);
  });

  it('takes the median so one noisy run does not decide', () => {
    expect(medianScores([{ performance: 0.7 }, { performance: 0.95 }, { performance: 0.93 }])).toEqual({ performance: 0.93 });
    expect(medianScores([{ performance: 0.8 }, { performance: 1 }])).toEqual({ performance: 0.9 });
  });
});

describe('fixture forecast', () => {
  const now = Date.UTC(2026, 10, 27, 8, 20);
  const f = fixtureForecast(now);

  it('covers 16 days of hours from today, fresh at seed time', () => {
    expect(f.hours).toHaveLength(16 * 24);
    expect(f.days).toHaveLength(16);
    expect(f.hours[0].time).toBe('2026-11-27T00:00');
    expect(f.days[0].date).toBe('2026-11-27');
    expect(f.fetchedAt).toBe(now);
  });

  it('has rain to advise on', () => {
    expect(f.hours.some((h) => h.precipProb >= 70 && h.precip > 0)).toBe(true);
  });
});
