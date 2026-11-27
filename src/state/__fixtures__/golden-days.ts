// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Sprint 5 golden days (docs/sprints/sprint-05.md) as Open-Meteo answers, shared
// by the golden-day tests and the site exposure evidence (#86).

import { CATALOGUE, type Inventory } from '../../engine/inventory';
import { DAILY_VARS } from '../../data/forecast-types';

export interface Conditions {
  /** Local start of the walk, YYYY-MM-DDTHH:00. */
  time: string;
  lat: number;
  lon: number;
  utcOffset: number;
  ta: number;
  /** Open-Meteo apparent temperature for these inputs (Steadman, no radiation). */
  feels: number;
  windKmh: number;
  gustKmh: number;
  rh: number;
  cloud: number;
  precipProb: number;
  precip: number;
  code: number;
  uv: number;
  /** W/m²: global, direct and diffuse horizontal, direct normal. */
  rad: [number, number, number, number];
}

// Three identical hours around the walk, so the window and its neighbours agree.
export function openMeteo(c: Conditions) {
  const hour = Number(c.time.slice(11, 13));
  const times = [hour - 1, hour, hour + 1].map((h) => `${c.time.slice(0, 11)}${String(h).padStart(2, '0')}:00`);
  const same = <T>(v: T) => times.map(() => v);
  return {
    latitude: c.lat,
    longitude: c.lon,
    timezone: 'GMT',
    utc_offset_seconds: c.utcOffset,
    hourly: {
      time: times,
      temperature_2m: same(c.ta),
      apparent_temperature: same(c.feels),
      precipitation_probability: same(c.precipProb),
      precipitation: same(c.precip),
      snowfall: same(0),
      weather_code: same(c.code),
      wind_speed_10m: same(c.windKmh),
      wind_gusts_10m: same(c.gustKmh),
      uv_index: same(c.uv),
      is_day: same(1),
      visibility: same(20000),
      relative_humidity_2m: same(c.rh),
      cloud_cover: same(c.cloud),
      shortwave_radiation: same(c.rad[0]),
      direct_radiation: same(c.rad[1]),
      diffuse_radiation: same(c.rad[2]),
      direct_normal_irradiance: same(c.rad[3]),
    },
    daily: Object.fromEntries([['time', [c.time.slice(0, 10)]], ...DAILY_VARS.map((k) => [k, [k === 'sunrise' || k === 'sunset' ? null : 0]])]),
  };
}

export const LONDON = { lat: 51.51, lon: -0.13, utcOffset: 0 };

export const DAYS = {
  // 3 °C, 25 km/h, showers, overcast; 10:00 in late November, sun about 13° up behind cloud.
  london: { ...LONDON, time: '2026-11-26T10:00', ta: 3, feels: -3.7, windKmh: 25, gustKmh: 38, rh: 85, cloud: 100, precipProb: 70, precip: 0.8, code: 80, uv: 0.5, rad: [45, 0, 45, 0] },
  // 15 °C, light wind, clear, midday in late April.
  mild: { ...LONDON, utcOffset: 3600, time: '2026-04-28T13:00', ta: 15, feels: 12.8, windKmh: 8, gustKmh: 14, rh: 60, cloud: 5, precipProb: 0, precip: 0, code: 0, uv: 5, rad: [690, 540, 150, 830] },
  // 28 °C, calm, clear, UV 8, Madrid at solar noon in July.
  madrid: { lat: 40.42, lon: -3.7, utcOffset: 7200, time: '2026-07-15T14:00', ta: 28, feels: 26.8, windKmh: 5, gustKmh: 9, rh: 30, cloud: 0, precipProb: 0, precip: 0, code: 0, uv: 8, rad: [900, 780, 120, 870] },
  // −10 °C, 15 km/h, dry, overcast; Oslo at midday in January, sun barely up.
  oslo: { lat: 59.91, lon: 10.75, utcOffset: 3600, time: '2027-01-15T12:00', ta: -10, feels: -16.2, windKmh: 15, gustKmh: 24, rh: 80, cloud: 100, precipProb: 0, precip: 0, code: 3, uv: 0, rad: [20, 0, 20, 0] },
  // 8 °C, calm and clear at noon on the March equinox.
  sunny8: { ...LONDON, time: '2026-03-20T12:00', ta: 8, feels: 5.9, windKmh: 3, gustKmh: 6, rh: 70, cloud: 0, precipProb: 0, precip: 0, code: 0, uv: 3, rad: [560, 430, 130, 700] },
  // The same 8 °C with 30 km/h wind under full cloud.
  cloudy8: { ...LONDON, time: '2026-03-20T12:00', ta: 8, feels: 0.6, windKmh: 30, gustKmh: 44, rh: 70, cloud: 100, precipProb: 0, precip: 0, code: 3, uv: 1, rad: [120, 0, 120, 0] },
} satisfies Record<string, Conditions>;

export type DayId = keyof typeof DAYS;

// Everything in the catalogue, in every thickness, with its usual protection.
export const COMPLETE: Inventory = Object.fromEntries(CATALOGUE.map((c) => [c.id, { counts: c.thickness ? { thin: 1, medium: 1, thick: 1 } : { medium: 1 } }]));
