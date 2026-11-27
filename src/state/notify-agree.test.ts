// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// A notification and the app must give the same advice for the same place and
// hour. Each case runs the app's planDay (the path Today, the Week and the
// Notifications preview take) and the Worker's planFor on a profile that went
// through the real subscribe request and the server's validation.

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComfortProfile } from '../engine/comfort';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { notificationText } from '../engine/notify';
import { biasPrior, replayBias } from '../engine/science/personal';
import type { Hour, Rating } from '../engine/types';
import type { Forecast } from '../data/forecast-types';
import { timeFmt } from '../data/format';
import { buildSubscribeRequest } from '../data/push';
import { DEFAULT_SETTINGS, type Routine, type Settings } from '../data/store';
import { planDay } from './advice';
import { toB64url } from '../../functions/_lib/b64';
import { parseSubscribe } from '../../functions/_lib/push-validate';
import { bodyFor, planFor } from '../../worker/src/plan';

const b64url = (bytes: number[]) => toB64url(new Uint8Array(bytes));
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/agree', keys: { p256dh: b64url([4, ...Array(64).fill(7)]), auth: b64url(Array(16).fill(3)) } };

// Two days in London: a frosty clear morning, a showery breezy afternoon, a milder next day.
function hour(time: string): Hour {
  const h = Number(time.slice(11, 13));
  const tomorrow = time.startsWith('2026-11-27');
  const sun = h >= 8 && h < 16 ? Math.sin(((h - 8) / 8) * Math.PI) : 0;
  const temp = (tomorrow ? 8 : 1) + 6 * sun;
  const wet = !tomorrow && h >= 14 && h < 18;
  return {
    time,
    temp,
    feels: temp - (wet ? 4 : 2),
    precipProb: wet ? 80 : 5,
    precip: wet ? 1.4 : 0,
    snow: 0,
    wind: wet ? 28 : 10,
    gusts: wet ? 50 : 18,
    uv: sun * 1.5,
    isDay: h >= 8 && h < 16,
    code: wet ? 80 : 1,
    visibility: 20000,
    rh: wet ? 92 : 75,
    cloud: wet ? 90 : 15,
    ghi: 320 * sun,
    direct: 220 * sun,
    diffuse: 100 * sun,
    dni: 450 * sun,
  };
}
const times = ['2026-11-26', '2026-11-27', '2026-11-28'].flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
// Coordinates already at the two decimals the server keeps, so both sides see the same place.
const forecast: Forecast = { lat: 51.51, lon: -0.13, timezone: 'Europe/London', utcOffsetSeconds: 0, hours: times.map(hour), days: [], fetchedAt: 0 };

const vote = (date: string, rating: -1 | 0 | 1, activity: Rating['activity'] = 'walking'): Rating => ({ date, rating, activity, effective: 4 });

interface Case {
  name: string;
  settings?: Partial<Settings>;
  comfort?: ComfortProfile;
  ratings?: Rating[];
  routines?: Routine[];
}

const CASES: Case[] = [
  { name: 'defaults' },
  { name: 'bands', settings: { engine: 'bands' } },
  { name: 'runs cold, longer outside', settings: { manualOffset: -2, duration: 8 }, comfort: { sensitivity: 'cold', windTolerance: 'low' } },
  {
    name: 'votes, some old',
    ratings: [vote('2026-10-02', -1), vote('2026-11-10', -1), vote('2026-11-18', -1, 'cycling'), vote('2026-11-19', 0, 'cycling'), vote('2026-11-20', -1, 'cycling'), vote('2026-11-24', 1)],
  },
  { name: 'votes under bands', settings: { engine: 'bands' }, ratings: [vote('2026-11-01', -1), vote('2026-11-22', -1)] },
  {
    name: 'commute by bike with routines',
    settings: { commute: { ...DEFAULT_SETTINGS.commute, enabled: true, out: '08:00', back: '17:00', days: [4, 5], mode: 'cycling' } },
    routines: [{ id: 'd', name: 'Dog walk', time: '18:30', hours: 1, days: [4], activity: 'walking' }],
    ratings: [vote('2026-11-25', -1, 'cycling')],
  },
];

function app(c: Case, date: string) {
  const settings = { ...DEFAULT_SETTINGS, ...c.settings };
  const comfort = c.comfort ?? DEFAULT_COMFORT;
  const ratings = c.ratings ?? [];
  // What the store's cloBias holds for these inputs.
  const bias = replayBias(biasPrior(comfort, settings.manualOffset), ratings);
  // Today plans with routines; other days without, as DayView does.
  const today = date === '2026-11-26';
  const plan = planDay(forecast, date, { settings, ratings, inventory: {}, comfort, bias, ...(today ? { routines: c.routines } : {}) });
  const req = buildSubscribeRequest({ subscription: SUB, place: forecast, tz: 'Europe/London', settings, comfort, learning: { bias: bias.mean, ratings, routines: c.routines } });
  const parsed = parseSubscribe(new TextEncoder().encode(JSON.stringify(req)).buffer as ArrayBuffer);
  if (!parsed.ok) throw new Error(parsed.message);
  return { plan, profile: parsed.body.profile, settings };
}

describe('a notification agrees with the app', () => {
  afterEach(() => vi.useRealTimers());

  for (const c of CASES) {
    for (const at of ['06:00', '07:30', '12:00', '16:00', '19:00']) {
      it(`${c.name}, today at ${at}`, () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(`2026-11-26T${at}:00Z`));
        const { plan, profile, settings } = app(c, '2026-11-26');
        const worker = planFor(forecast, '2026-11-26', profile, `2026-11-26T${at}`);
        expect(worker?.advice.band).toBe(plan?.advice.band);
        expect(worker?.advice.effective).toBe(plan?.advice.effective);
        expect(worker?.advice.requirements?.clo?.icl).toBe(plan?.advice.requirements?.clo?.icl);
        expect(worker?.advice.extras.map((e) => e.id)).toEqual(plan?.advice.extras.map((e) => e.id));
        expect(bodyFor(worker!, profile, 'today')).toBe(notificationText(plan!.advice, plan!.dayHours, timeFmt(settings.units.clock), 'today'));
      });
    }

    it(`${c.name}, tomorrow from the evening`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-26T20:00:00Z'));
      const { plan, profile, settings } = app(c, '2026-11-27');
      const worker = planFor(forecast, '2026-11-27', profile, '2026-11-26T20:00')!;
      expect(worker.advice.band).toBe(plan!.advice.band);
      expect(bodyFor(worker, profile, 'tomorrow')).toBe(notificationText(plan!.advice, plan!.dayHours, timeFmt(settings.units.clock), 'tomorrow'));
    });
  }

  it('uses the science engine and is warmer for a cold-running person', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T07:30:00Z'));
    const plain = app(CASES[0], '2026-11-26');
    const cold = app(CASES[2], '2026-11-26');
    expect(plain.plan!.advice.requirements?.clo).toBeDefined();
    expect(cold.plan!.advice.requirements!.clo!.icl).toBeGreaterThan(plain.plan!.advice.requirements!.clo!.icl);
  });

  it('ages the vote pull a week on exactly as the app does', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T07:30:00Z'));
    const c = CASES[3];
    const { profile } = app(c, '2026-11-26');
    // The device last sent its profile on the 26th; a week later it has not been opened.
    const later: Forecast = { ...forecast, hours: forecast.hours.map((h) => ({ ...h, time: h.time.replace('2026-11-2', '2026-12-0') })) };
    vi.setSystemTime(new Date('2026-12-06T07:30:00Z'));
    const settings = { ...DEFAULT_SETTINGS, ...c.settings };
    const bias = replayBias(biasPrior(DEFAULT_COMFORT, 0), c.ratings!);
    const appPlan = planDay(later, '2026-12-06', { settings, ratings: c.ratings!, inventory: {}, comfort: DEFAULT_COMFORT, bias })!;
    const worker = planFor(later, '2026-12-06', profile, '2026-12-06T07:30')!;
    expect(worker.advice.why.learnedOffset).toBe(appPlan.advice.why.learnedOffset);
    expect(worker.advice.effective).toBe(appPlan.advice.effective);
  });

  it('falls back to the bias prior and the default engine for an old subscription', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T07:30:00Z'));
    const comfort: ComfortProfile = { sensitivity: 'cold' };
    const { plan, profile } = app({ name: 'old', comfort, settings: { manualOffset: -1 } }, '2026-11-26');
    const { engine: _e, bias: _b, duration: _d, ...old } = profile;
    void _e;
    void _b;
    void _d;
    const worker = planFor(forecast, '2026-11-26', old, '2026-11-26T07:30')!;
    expect(worker.advice.requirements?.clo?.icl).toBe(plan!.advice.requirements?.clo?.icl);
  });
});
