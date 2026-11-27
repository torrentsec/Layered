// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Sprint 5 golden days (docs/sprints/sprint-05.md), written by the PO before
// the science engine existed. Each runs an Open-Meteo answer through
// parseForecast and planDay, the path Today takes. The science engine must
// give the PO's verdict; the band engine's answer is recorded for comparison.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bandRank } from '../engine/bands';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { category } from '../engine/inventory';
import type { Activity, Advice } from '../engine/types';
import { parseForecast } from '../data/forecast-types';
import { DEFAULT_SETTINGS, type Settings } from '../data/store';
import { planDay } from './advice';
import { COMPLETE, DAYS, openMeteo, type Conditions, type DayId } from './__fixtures__/golden-days';

function run(id: DayId, engine: Settings['engine'], activity: Activity = 'walking'): Advice {
  const c: Conditions = DAYS[id];
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(`${c.time}:00Z`) - c.utcOffset * 1000 + 5 * 60_000));
  const f = parseForecast(openMeteo(c) as Parameters<typeof parseForecast>[0], 0);
  const settings: Settings = { ...DEFAULT_SETTINGS, activity, duration: 0.5, engine };
  // A 30-minute walk, no bias, nothing learned.
  const plan = planDay(f, c.time.slice(0, 10), { settings, ratings: [], inventory: COMPLETE, comfort: DEFAULT_COMFORT, garmentWarmth: {}, bias: { mean: 0, count: 0 } });
  expect(plan).not.toBeNull();
  return plan!.advice;
}

const outer = (a: Advice) => a.layers.find((l) => l.kind === 'outer');
const outerProps = (a: Advice) => {
  const o = outer(a);
  return o?.category ? category(o.category).defaults : undefined;
};

/** The band engine's verdicts on these days when the science engine arrived, for comparison. */
const BAND_ENGINE: Record<DayId | 'cycling', Advice['band']> = {
  london: 'bundle',
  mild: 'two',
  madrid: 'tshirt',
  oslo: 'bundle',
  sunny8: 'coat',
  cloudy8: 'bundle',
  cycling: 'bundle',
};

afterEach(() => vi.useRealTimers());

describe('golden days, band engine (recorded)', () => {
  it.each(Object.keys(DAYS) as DayId[])('%s', (id) => {
    const a = run(id, 'bands');
    expect(a.band).toBe(BAND_ENGINE[id]);
    expect(a.science).toBeUndefined();
    expect(a.requirements?.clo).toBeUndefined();
  });

  it('cycling', () => expect(run('london', 'bands', 'cycling').band).toBe(BAND_ENGINE.cycling));

  // Recorded from the Sprint 5 band engine, so choosing bands in Settings keeps exactly those outfits.
  it('gives the Sprint 5 outfits', () => {
    const outfit = (a: Advice) => ({ band: a.band, layers: a.layers.map((l) => [l.kind, l.category, l.thickness].filter(Boolean).join(' ')), extras: a.extras.map((e) => e.id) });
    expect(Object.fromEntries((Object.keys(DAYS) as DayId[]).map((id) => [id, outfit(run(id, 'bands'))]))).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "band": "bundle",
          "extras": [
            "gloves",
            "hat",
          ],
          "layers": [
            "base thermal medium",
            "mid jumper thick",
            "outer coat thick",
            "bottoms heavy-trousers",
            "footwear trainers",
          ],
        },
        "london": {
          "band": "bundle",
          "extras": [
            "umbrella",
            "gloves",
            "hat",
            "scarf",
          ],
          "layers": [
            "base thermal thick",
            "mid jumper thick",
            "outer waterproof-jacket thick",
            "bottoms heavy-trousers",
            "footwear waterproof-shoes",
          ],
        },
        "madrid": {
          "band": "tshirt",
          "extras": [
            "sunglasses",
            "sunscreen",
          ],
          "layers": [
            "base tshirt thin",
            "bottoms shorts",
            "footwear sandals",
          ],
        },
        "mild": {
          "band": "two",
          "extras": [
            "sunglasses",
          ],
          "layers": [
            "base longsleeve medium",
            "mid jumper medium",
            "bottoms jeans",
            "footwear trainers",
          ],
        },
        "oslo": {
          "band": "bundle",
          "extras": [
            "gloves",
            "hat",
            "scarf",
          ],
          "layers": [
            "base thermal thick",
            "mid jumper thick",
            "outer coat thick",
            "bottoms heavy-trousers",
            "footwear trainers",
          ],
        },
        "sunny8": {
          "band": "coat",
          "extras": [
            "sunglasses",
          ],
          "layers": [
            "base longsleeve medium",
            "mid jumper medium",
            "outer coat medium",
            "bottoms jeans",
            "footwear trainers",
          ],
        },
      }
    `);
  });
});

const DEFAULT_PATH: Settings['engine'] = DEFAULT_SETTINGS.engine;

describe('default settings', () => {
  it('have no engine set, so they exercise the fallback', () => expect(DEFAULT_PATH).toBeUndefined());

  it('give the science engine', () => {
    for (const id of Object.keys(DAYS) as DayId[]) expect(run(id, DEFAULT_PATH)).toEqual(run(id, 'science'));
  });
});

describe('golden days, science engine through the default settings', () => {
  it('London, 26 Nov: coat, with a waterproof outer', () => {
    const a = run('london', DEFAULT_PATH);
    expect(a.band).toBe('coat');
    expect(['waterproof', 'hood']).toContain(a.requirements?.rain);
    expect(outerProps(a)?.water).toBe('waterproof');
  });

  it('mild and sunny: two light layers, nothing heavy', () => {
    const a = run('mild', DEFAULT_PATH);
    expect(a.band).toBe('two');
    expect(outer(a)).toBeUndefined();
    expect(a.layers.filter((l) => l.kind === 'base' || l.kind === 'mid').every((l) => l.thickness !== 'thick')).toBe(true);
  });

  it('Madrid, summer: T-shirt, with sunscreen', () => {
    const a = run('madrid', DEFAULT_PATH);
    expect(a.band).toBe('tshirt');
    expect(a.extras.map((e) => e.id)).toContain('sunscreen');
  });

  it('Oslo, January: bundle up, with hat and gloves', () => {
    const a = run('oslo', DEFAULT_PATH);
    expect(a.band).toBe('bundle');
    expect(a.requirements?.accessories).toEqual(expect.arrayContaining(['hat', 'gloves']));
  });

  it('sun against cloud: the clear day is at least one band lighter', () => {
    expect(bandRank(run('sunny8', DEFAULT_PATH).band)).toBeLessThanOrEqual(bandRank(run('cloudy8', DEFAULT_PATH).band) - 1);
  });

  it('cycling: same or warmer than walking, with a windproof outer', () => {
    const walk = run('london', DEFAULT_PATH);
    const ride = run('london', DEFAULT_PATH, 'cycling');
    expect(bandRank(ride.band)).toBeGreaterThanOrEqual(bandRank(walk.band));
    expect(ride.requirements!.clo!.icl).toBeGreaterThanOrEqual(walk.requirements!.clo!.icl);
    expect(ride.requirements?.wind).not.toBe('none');
    expect(outerProps(ride)?.wind).toBe('high');
  });

  it('explains itself in clo and UTCI', () => {
    const a = run('london', DEFAULT_PATH);
    expect(a.science?.exposureMinutes).toBe(30);
    expect(a.science?.target.icl).toBe(a.requirements?.clo?.icl);
    expect(a.science?.utci.utci).toBeLessThan(DAYS.london.ta);
    expect(a.why.rules[0]).toMatch(/^Needs about \d\.\d clo/);
  });
});
