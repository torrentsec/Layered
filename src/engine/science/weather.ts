// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * One forecast hour, from either provider and saved or fresh, as the science
 * engine's Weather. docs/science/thermal-model.md §6.2 (forecast radiation)
 * and §6.3 (estimate from cloud cover).
 */

import type { Hour } from '../types';
import { estimateRadiation, meanRadiantTemp, splitGhi, sunForHourMean, sunPosition } from './radiation';
import type { HourToWeatherFn, Radiation, SunPosition, Weather } from './types';

/** MET Norway's parser assumes the same when a step has no humidity. */
export const DEFAULT_RH = 70;

const KMH = 1 / 3.6;
const LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const finite = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Cloud fraction implied by a WMO weather code, for hours saved before the
 * forecast carried cloud cover. 0–3 are named by cover; showers come from
 * broken convective cloud; fog and steady precipitation mean an overcast sky.
 */
export function cloudFromCode(code: number): number {
  switch (code) {
    case 0:
      return 0;
    case 1:
      return 0.25;
    case 2:
      return 0.5;
    case 80:
    case 81:
    case 82:
    case 85:
    case 86:
      return 0.75;
    default:
      return 1;
  }
}

/** UTC instant of a local wall-clock time such as "2026-11-26T08:00". */
function utcMs(localIso: string, utcOffsetSeconds: number): number {
  // Date.parse accepts loose strings in some engines; only the forecast's own form counts.
  if (!LOCAL_ISO.test(localIso)) return Number.NaN;
  return Date.parse(`${localIso.slice(0, 16)}:00Z`) - utcOffsetSeconds * 1000;
}

/** Forecast radiation, completing a row that has the global value but not its split. */
function forecastRadiation(h: Hour, sun: SunPosition): Radiation | null {
  if (!finite(h.ghi)) return null;
  const split = finite(h.direct) && finite(h.diffuse) ? { direct: h.direct, diffuse: h.diffuse } : splitGhi(sun, h.ghi);
  return { ghi: h.ghi, ...split, ...(finite(h.dni) ? { dni: h.dni } : {}) };
}

export const hourToWeather: HourToWeatherFn = (h, place): Weather => {
  const ta = h.temp;
  const rh = finite(h.rh) ? h.rh : DEFAULT_RH;
  const wind10 = finite(h.wind) ? Math.max(0, h.wind) * KMH : 0;
  const cloud = finite(h.cloud) ? h.cloud / 100 : cloudFromCode(h.code);
  const at = utcMs(h.time, finite(place.utcOffsetSeconds) ? place.utcOffsetSeconds : 0);
  if (!finite(place.lat) || !finite(place.lon) || !Number.isFinite(at)) {
    return { ta, rh, wind10, tmrt: ta, radiation: 'none' };
  }
  // Open-Meteo radiation is the mean over the preceding hour, so its sun is
  // taken at the middle of that hour; cloud cover is instantaneous.
  const meanSun = sunForHourMean(place.lat, place.lon, at);
  const forecast = forecastRadiation(h, meanSun);
  if (forecast) {
    return { ta, rh, wind10, tmrt: meanRadiantTemp(ta, rh, cloud, meanSun, forecast), radiation: 'forecast' };
  }
  const sun = sunPosition(place.lat, place.lon, at);
  const estimated = estimateRadiation(sun, cloud);
  return { ta, rh, wind10, tmrt: meanRadiantTemp(ta, rh, cloud, sun, estimated), radiation: 'estimated' };
};
