// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Evidence for spike #86 (docs/innovation/sprint-07-site-exposure.md): the
// golden days and the recorded London forecasts dressed for an open site, a
// city street and mostly shade. The snapshots are the write-up's tables.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { advise } from '../engine/advise';
import type { Activity, Advice, Hour } from '../engine/types';
import { selectWindow } from '../engine/window';
import { parseForecast, type Forecast } from '../data/forecast-types';
import { parseMetno } from '../data/metno';
import { LONDON as METNO_LONDON } from '../data/metno.fixture';
import { OPEN_METEO_LONDON } from '../data/openmeteo.fixture';
import { DEFAULT_SETTINGS } from '../data/store';
import { placeOf } from '../data/day-plan';
import { planDay } from './advice';
import { COMPLETE, DAYS, openMeteo, type DayId } from './__fixtures__/golden-days';
import { STREET_WIND_FACTOR, type Site } from '../engine/science/site';

afterEach(() => vi.useRealTimers());

/** The same inputs planDay gives advise for a walk with nothing learned; Today's default is 30 minutes. */
function dress(f: Forecast, hours: Hour[], activity: Activity, site: Site, exposureHours = 0.5): Advice {
  const a = advise({
    hours,
    activity,
    manualOffset: 0,
    ratings: [],
    today: hours[0].time.slice(0, 10),
    inventory: COMPLETE,
    comfort: DEFAULT_COMFORT,
    garmentWarmth: {},
    science: { place: { ...placeOf(f), site }, bias: 0, biasCount: 0, exposureHours },
  });
  expect(a).not.toBeNull();
  return a!;
}

const outfit = (a: Advice) => [...a.layers.map((l) => [l.kind, l.category, l.thickness].filter(Boolean).join(' ')), ...a.extras.map((e) => e.id)];
const clo = (a: Advice) => Math.round(a.requirements!.clo!.icl * 100) / 100;
const utci = (a: Advice) => Math.round(a.science!.feels.min * 10) / 10;

/** Items added and dropped against the open-site outfit. */
function flip(open: Advice, other: Advice) {
  const o = new Set(outfit(open));
  const n = new Set(outfit(other));
  return { add: [...n].filter((x) => !o.has(x)), drop: [...o].filter((x) => !n.has(x)) };
}

function golden(id: DayId, activity: Activity) {
  const c = DAYS[id];
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(`${c.time}:00Z`) - c.utcOffset * 1000 + 5 * 60_000));
  const f = parseForecast(openMeteo(c) as Parameters<typeof parseForecast>[0], 0);
  const settings = { ...DEFAULT_SETTINGS, activity, duration: 0.5, engine: 'science' as const };
  const plan = planDay(f, c.time.slice(0, 10), { settings, ratings: [], inventory: COMPLETE, comfort: DEFAULT_COMFORT, garmentWarmth: {}, bias: { mean: 0, count: 0 } });
  vi.useRealTimers();
  return { f, today: plan!.advice };
}

const CASES: [DayId, Activity][] = [
  ['london', 'walking'],
  ['london', 'cycling'],
  ['mild', 'walking'],
  ['madrid', 'walking'],
  ['oslo', 'walking'],
  ['sunny8', 'walking'],
  ['cloudy8', 'walking'],
];

function row(f: Forecast, hours: Hour[], activity: Activity) {
  const [open, street, shade] = (['open', 'street', 'shade'] as Site[]).map((s) => dress(f, hours, activity, s));
  return {
    clo: [clo(open), clo(street), clo(shade)],
    utci: [utci(open), utci(street), utci(shade)],
    street: flip(open, street),
    shade: flip(open, shade),
  };
}

describe('site exposure on the golden days', () => {
  it('dresses the open site exactly as Today does, so the harness is the real path', () => {
    for (const [id, activity] of CASES) {
      const { f, today } = golden(id, activity);
      expect(outfit(dress(f, today.hours, activity, 'open'))).toEqual(outfit(today));
      expect(clo(dress(f, today.hours, activity, 'open'))).toBe(clo(today));
    }
  });

  it('records clo [open, street, shade], UTCI and the garments that change', () => {
    const table = Object.fromEntries(CASES.map(([id, activity]) => {
      const { f, today } = golden(id, activity);
      return [`${id} ${activity}`, row(f, today.hours, activity)];
    }));
    expect(table).toMatchInlineSnapshot(`
      {
        "cloudy8 walking": {
          "clo": [
            1.38,
            1.38,
            1.38,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [],
            "drop": [],
          },
          "utci": [
            -6.4,
            -1.9,
            -6.4,
          ],
        },
        "london cycling": {
          "clo": [
            1.38,
            1.38,
            1.38,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [],
            "drop": [],
          },
          "utci": [
            -13.5,
            -7.1,
            -13.5,
          ],
        },
        "london walking": {
          "clo": [
            1.38,
            1.38,
            1.38,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [],
            "drop": [],
          },
          "utci": [
            -13.5,
            -7.1,
            -13.5,
          ],
        },
        "madrid walking": {
          "clo": [
            0.36,
            0.36,
            0.36,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [],
            "drop": [],
          },
          "utci": [
            32,
            31,
            28.5,
          ],
        },
        "mild walking": {
          "clo": [
            0.75,
            0.68,
            0.75,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [
              "base longsleeve thick",
              "mid jumper thin",
            ],
            "drop": [
              "base longsleeve medium",
              "mid jumper medium",
            ],
          },
          "utci": [
            21.6,
            18.5,
            15.7,
          ],
        },
        "oslo walking": {
          "clo": [
            1.65,
            1.45,
            1.65,
          ],
          "shade": {
            "add": [],
            "drop": [],
          },
          "street": {
            "add": [
              "base longsleeve medium",
              "mid fleece medium",
              "outer coat medium",
            ],
            "drop": [
              "base thermal thick",
              "mid fleece thick",
              "outer coat thick",
            ],
          },
          "utci": [
            -24.2,
            -17.9,
            -24.2,
          ],
        },
        "sunny8 walking": {
          "clo": [
            0.78,
            0.97,
            1.02,
          ],
          "shade": {
            "add": [
              "outer light-jacket thin",
            ],
            "drop": [],
          },
          "street": {
            "add": [
              "outer light-jacket thin",
            ],
            "drop": [],
          },
          "utci": [
            18.6,
            12.2,
            11.1,
          ],
        },
      }
    `);
  });
});

/** Every walk starting 07:00 to 18:00 local in a recorded forecast. */
function walks(f: Forecast, hours: number): Hour[][] {
  const starts = f.hours.filter((h) => {
    const hh = Number(h.time.slice(11, 13));
    return hh >= 7 && hh <= 18;
  });
  return starts.map((h) => selectWindow(f.hours, h.time, hours)).filter((w) => w.length > 0);
}

function tally(f: Forecast, windScale = 1, hours = 0.5) {
  const scaled = (hs: Hour[]) => hs.map((h) => ({ ...h, wind: h.wind * windScale }));
  let n = 0;
  const changed = { street: 0, shade: 0 };
  const dClo = { street: [] as number[], shade: [] as number[] };
  for (const w of walks(f, hours)) {
    n++;
    const open = dress(f, w, 'walking', 'open', hours);
    const street = dress(f, scaled(w), 'walking', 'street', hours);
    const shade = dress(f, w, 'walking', 'shade', hours);
    for (const [k, a] of [['street', street], ['shade', shade]] as const) {
      const d = flip(open, a);
      if (d.add.length || d.drop.length) changed[k]++;
      dClo[k].push(clo(a) - clo(open));
    }
  }
  const span = (xs: number[]) => [Math.round(Math.min(...xs) * 100) / 100, Math.round(Math.max(...xs) * 100) / 100];
  return { walks: n, outfitChanged: changed, cloDelta: { street: span(dClo.street), shade: span(dClo.shade) } };
}

describe('site exposure on the recorded London forecasts', () => {
  const metno = parseMetno(METNO_LONDON, 0, 0);
  const om = parseForecast(OPEN_METEO_LONDON, 0);

  it('MET Norway, ten days, radiation estimated from cloud', () => {
    expect(tally(metno)).toMatchInlineSnapshot(`
      {
        "cloDelta": {
          "shade": [
            0,
            0.22,
          ],
          "street": [
            -0.13,
            0.15,
          ],
        },
        "outfitChanged": {
          "shade": 12,
          "street": 11,
        },
        "walks": 107,
      }
    `);
  });

  it('Open-Meteo, the hours around sunrise, forecast radiation', () => {
    expect(tally(om)).toMatchInlineSnapshot(`
      {
        "cloDelta": {
          "shade": [
            0,
            0,
          ],
          "street": [
            0,
            0,
          ],
        },
        "outfitChanged": {
          "shade": 0,
          "street": 0,
        },
        "walks": 4,
      }
    `);
  });

  it('MET Norway, two-hour walks, where the exposure no longer caps the target', () => {
    expect(tally(metno, 1, 2)).toMatchInlineSnapshot(`
      {
        "cloDelta": {
          "shade": [
            0,
            0.22,
          ],
          "street": [
            -0.3,
            0.15,
          ],
        },
        "outfitChanged": {
          "shade": 23,
          "street": 59,
        },
        "walks": 107,
      }
    `);
  });

  it('street wind sheltered to 0.4 and 0.8 of open instead of 0.6', () => {
    expect({
      0.4: tally(metno, 0.4 / STREET_WIND_FACTOR),
      0.8: tally(metno, 0.8 / STREET_WIND_FACTOR),
    }).toMatchInlineSnapshot(`
      {
        "0.4": {
          "cloDelta": {
            "shade": [
              0,
              0.22,
            ],
            "street": [
              -0.22,
              0.08,
            ],
          },
          "outfitChanged": {
            "shade": 12,
            "street": 26,
          },
          "walks": 107,
        },
        "0.8": {
          "cloDelta": {
            "shade": [
              0,
              0.22,
            ],
            "street": [
              -0.08,
              0.2,
            ],
          },
          "outfitChanged": {
            "shade": 12,
            "street": 15,
          },
          "walks": 107,
        },
      }
    `);
  });
});
