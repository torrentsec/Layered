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
import { feelsInClothes } from '../data/feels-in-clothes';
import { comfortTime } from '../engine/science/comfort-time';
import { hourToWeather } from '../engine/science/weather';
import { COMPLETE, DAYS, openMeteo, type Conditions, type DayId } from './__fixtures__/golden-days';
import { adviceMargin, marginText } from '../data/margin-text';
import { calibratedReading } from '../data/feels-calibration';

function run(id: DayId, engine: Settings['engine'], activity: Activity = 'walking', duration = 0.5): Advice {
  const c: Conditions = DAYS[id];
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(`${c.time}:00Z`) - c.utcOffset * 1000 + 5 * 60_000));
  const f = parseForecast(openMeteo(c) as Parameters<typeof parseForecast>[0], 0);
  const settings: Settings = { ...DEFAULT_SETTINGS, activity, duration, engine };
  // A 30-minute walk unless asked otherwise, no bias, nothing learned.
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

// #85 prototype (docs/innovation/sprint-07-feels-in-clothes.md): how long the outfit keeps you warm.
describe('golden days, feels like in what you wear', () => {
  const placeOf = (id: DayId) => ({ lat: DAYS[id].lat, lon: DAYS[id].lon, utcOffsetSeconds: DAYS[id].utcOffset });
  const line = (id: DayId, activity: Activity = 'walking', duration = 0.5) => feelsInClothes(run(id, DEFAULT_PATH, activity, duration), placeOf(id));

  it('an outfit at the clothing target is warm for the whole time outside', () => {
    for (const id of ['london', 'oslo', 'cloudy8'] as const) for (const activity of ['walking', 'cycling'] as const) for (const d of [0.5, 1, 2, 4]) {
      const a = run(id, DEFAULT_PATH, activity, d);
      const t = comfortTime({ hours: a.hours.map((h) => hourToWeather(h, placeOf(id))), metabolic: a.science!.metabolic, worn: a.science!.target.icl, bias: 0 })!;
      expect(t.warm * 60, `${id} ${activity} ${d} h`).toBeGreaterThanOrEqual(a.science!.exposureMinutes - 3);
    }
  });

  it('says nothing on a hot day, and warm all day on mild ones', () => {
    expect(line('madrid')).toBeUndefined();
    expect(line('mild')).toMatchObject({ line: 'Warm enough in this outfit for your 30 min out.', sub: 'Good for hours.' });
    expect(line('sunny8')?.tone).toBe('covered');
  });

  it('cloudy 8 °C: the coat covers a 30-minute walk', () => {
    expect(line('cloudy8')).toMatchObject({ tone: 'covered', line: 'Warm enough in your coat for your 30 min out.', sub: 'Good for about 60 min in all.' });
  });

  // #92: matching in clo. London 26 Nov summed 1.17 against 1.38 while matching worked in points.
  it('a complete wardrobe reaches the target, less 0.1 clo at most', () => {
    for (const id of Object.keys(DAYS) as DayId[]) for (const activity of ['walking', 'cycling'] as const) {
      const a = run(id, DEFAULT_PATH, activity);
      expect(a.science!.outfit!.basic, `${id} ${activity}`).toBeGreaterThanOrEqual(a.science!.target.icl - 0.1);
    }
    expect(run('london', DEFAULT_PATH).science!.outfit!.basic).toBeCloseTo(1.38, 1);
  });

  it('London: the matched outfit covers the walk, and the line says so', () => {
    expect(line('london')?.tone).toBe('covered');
  });

  it('Oslo for an hour: the heaviest plan is not enough, and the line asks for a layer', () => {
    expect(line('oslo', 'walking', 1)).toMatchObject({ tone: 'cold', sub: expect.stringContaining('Add a layer') });
  });
});

// Spike #88: how far each golden day is from changing band, through the same
// path "Why this?" takes. Recorded as evidence, not as a verdict.
describe('golden days, margin to the next band (spike #88)', () => {
  it('reruns to the advice band and records the margins', () => {
    const margins = Object.fromEntries((Object.keys(DAYS) as DayId[]).map((id) => {
      const a = run(id, DEFAULT_PATH);
      const c = DAYS[id];
      const m = adviceMargin(a, { lat: c.lat, lon: c.lon, utcOffsetSeconds: c.utcOffset });
      expect(m?.band).toBe(a.band);
      return [id, m];
    }));
    expect(margins).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "band": "coat",
        },
        "london": {
          "band": "coat",
          "colder": {
            "band": "bundle",
            "by": 5,
          },
        },
        "madrid": {
          "band": "tshirt",
        },
        "mild": {
          "band": "two",
          "warmer": {
            "band": "light",
            "by": 1,
          },
        },
        "oslo": {
          "band": "bundle",
          "warmer": {
            "band": "coat",
            "by": 3,
          },
        },
        "sunny8": {
          "band": "two",
          "colder": {
            "band": "jacket",
            "by": 5,
          },
          "warmer": {
            "band": "light",
            "by": 4,
          },
        },
      }
    `);
  });
});

// Sprint 8 (#93): what each golden day shows by default. The hero is the real
// temperature with how it feels beneath; "What would change this" appears only
// where 2° or less would change the advice.
describe('golden days, the default headline and margin (Sprint 8)', () => {
  it('records the hero and whether the margin shows, in °C and °F', () => {
    const rows = Object.fromEntries((Object.keys(DAYS) as DayId[]).map((id) => {
      const a = run(id, DEFAULT_PATH);
      const c = DAYS[id];
      const m = adviceMargin(a, { lat: c.lat, lon: c.lon, utcOffsetSeconds: c.utcOffset });
      const shows = (u: 'c' | 'f') => (m ? marginText(m, u).show : false);
      const c1 = calibratedReading(a, 'c');
      const f1 = calibratedReading(a, 'f');
      return [id, { c: `${c1.text} ${c1.note}`.trim(), f: `${f1.text} ${f1.note}`.trim(), margin: { c: shows('c'), f: shows('f') } }];
    }));
    expect(rows).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "c": "8° Feels -6° in the wind",
          "f": "46° Feels 20° in the wind",
          "margin": {
            "c": false,
            "f": false,
          },
        },
        "london": {
          "c": "3° Feels -13° in the wind",
          "f": "37° Feels 8° in the wind",
          "margin": {
            "c": false,
            "f": false,
          },
        },
        "madrid": {
          "c": "28° Feels 32° in the sun",
          "f": "82° Feels 90° in the sun",
          "margin": {
            "c": false,
            "f": false,
          },
        },
        "mild": {
          "c": "15° Feels 22° in the sun",
          "f": "59° Feels 71° in the sun",
          "margin": {
            "c": true,
            "f": true,
          },
        },
        "oslo": {
          "c": "-10° Feels -24° in the wind",
          "f": "14° Feels -12° in the wind",
          "margin": {
            "c": false,
            "f": false,
          },
        },
        "sunny8": {
          "c": "8° Feels 19° in the sun",
          "f": "46° Feels 66° in the sun",
          "margin": {
            "c": false,
            "f": false,
          },
        },
      }
    `);
  });
});
