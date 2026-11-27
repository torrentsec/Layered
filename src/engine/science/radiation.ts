// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * Sun position, shortwave estimate from cloud cover, mean radiant temperature
 * for a standing person in an open site, and wind at body height.
 * Method and constants: docs/science/thermal-model.md §6. Checked against
 * src/engine/science/__fixtures__/mrt.json (scripts/science/generate_fixtures.py).
 *
 * Sources:
 * - Spencer, J. W. (1971). Fourier series representation of the position of the
 *   sun. Search 2(5), 172. Declination and equation-of-time series, in the form
 *   NOAA publishes as "General Solar Position Calculations".
 * - Haurwitz, B. (1945). Insolation in relation to cloudiness and cloud density.
 *   J Meteorol 2, 154–166. Clear-sky global irradiance.
 * - Kasten, F., Czeplak, G. (1980). Solar and terrestrial radiation dependent on
 *   the amount and type of cloud. Solar Energy 24, 177–189.
 * - Erbs, D. G., Klein, S. A., Duffie, J. A. (1982). Estimation of the diffuse
 *   radiation fraction for hourly, daily and monthly-average global radiation.
 *   Solar Energy 28(4), 293–302.
 * - Brutsaert, W. (1975). On a derivable formula for long-wave radiation from
 *   clear skies. Water Resour Res 11(5), 742–744.
 * - Crawford, T. M., Duchon, C. E. (1999). An improved parameterization for
 *   estimating effective atmospheric emissivity for use in calculating daytime
 *   downwelling longwave radiation. J Appl Meteorol 38, 474–480.
 * - Thorsson, S., Lindberg, F., Eliasson, I., Holmer, B. (2007). Different
 *   methods for estimating the mean radiant temperature in an outdoor urban
 *   setting. Int J Climatol 27, 1983–1993.
 * - Kántor, N., Unger, J. (2011). The most problematic variable in the course of
 *   human-biometeorological comfort assessment — the mean radiant temperature.
 *   Cent Eur J Geosci 3(1), 90–100.
 * - Di Napoli, C., Hogan, R. J., Pappenberger, F. (2020). Mean radiant
 *   temperature from global-scale numerical weather prediction models.
 *   Int J Biometeorol 64, 1233–1245, eq. 14 and 15 (two angle factors of 0.5,
 *   αir 0.7, εp 0.97, fp after Jendritzky et al. 1990 / VDI 3787).
 * - Bröde, P. et al. (2012). Deriving the operational procedure for the
 *   Universal Thermal Climate Index (UTCI). Int J Biometeorol 56, 481–494.
 *   Logarithmic wind profile from 10 m to 1.1 m.
 */

import type {
  EstimateRadiationFn,
  MeanRadiantTempFn,
  Radiation,
  SunPosition,
  SunPositionFn,
  WindAtBodyFn,
} from './types';

const SIGMA = 5.67e-8;
const KELVIN = 273.15;
const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;

/** Shortwave absorptivity of the clothed body (Di Napoli et al. 2020). */
export const ABSORPTIVITY_SW = 0.7;
/** Emissivity of the clothed body. */
export const EMISSIVITY_BODY = 0.97;
/** Open grass or paving; snow would be about 0.8 and is not modelled. */
export const ALBEDO = 0.2;
/**
 * Below this the beam is ignored: direct/sin(β) diverges near the horizon and
 * an hourly mean that straddles sunrise or sunset would overstate it.
 */
export const MIN_SUN_ELEVATION = 1;
/**
 * The open-site, dry-air assumption sees the whole cold sky, which overstates
 * night cooling; thermal-model.md §6.2 caps it until votes say otherwise.
 */
export const NIGHT_CAP_K = 10;
/** Forecast radiation is the mean over the preceding hour, so the sun is taken at its middle. */
export const HOUR_MEAN_OFFSET_MS = 30 * 60_000;
/** ln(1.1/z0) / ln(10/z0) with z0 = 0.01 m, open ground, as in UTCI. */
export const WIND_BODY_FACTOR = Math.log(1.1 / 0.01) / Math.log(10 / 0.01);

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const nonNeg = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

function dayOfYearUtc(utcMs: number): number {
  const d = new Date(utcMs);
  return Math.floor((utcMs - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY_MS) + 1;
}

/** Solar elevation without refraction; the fixtures and the 1° threshold assume none. */
export const sunPosition: SunPositionFn = (lat, lon, utcMs) => {
  const doy = dayOfYearUtc(utcMs);
  const hour = (((utcMs % DAY_MS) + DAY_MS) % DAY_MS) / 3_600_000;
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24);
  const eqtMin =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const trueSolarMin = hour * 60 + eqtMin + 4 * lon;
  const ha = (trueSolarMin / 4 - 180) * DEG;
  const phi = lat * DEG;
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  return { elevation: Math.asin(clamp(sinEl, -1, 1)) / DEG, dayOfYear: doy };
};

/** Sun for an hourly row stamped at the end of its averaging hour. */
export function sunForHourMean(lat: number, lon: number, hourEndUtcMs: number): SunPosition {
  return sunPosition(lat, lon, hourEndUtcMs - HOUR_MEAN_OFFSET_MS);
}

export function clearSkyGhi(elevation: number): number {
  const cz = Math.sin(elevation * DEG);
  return cz > 0 ? 1098 * cz * Math.exp(-0.057 / cz) : 0;
}

export function erbsDiffuseFraction(kt: number): number {
  if (kt <= 0.22) return 1 - 0.09 * kt;
  if (kt <= 0.8) return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4;
  return 0.165;
}

/** Splits horizontal global irradiance into direct and diffuse on the horizontal plane. */
export function splitGhi(sun: SunPosition, ghi: number): { direct: number; diffuse: number } {
  const g = nonNeg(ghi);
  const cz = Math.sin(sun.elevation * DEG);
  if (cz <= 0 || g === 0) return { direct: 0, diffuse: g };
  const e0 = 1361 * (1 + 0.033 * Math.cos((2 * Math.PI * sun.dayOfYear) / 365));
  const kt = Math.min(g / (e0 * cz), 1);
  const diffuse = g * erbsDiffuseFraction(kt);
  return { direct: g - diffuse, diffuse };
}

/** For providers without radiation (MET Norway). `cloud` is a 0..1 fraction. */
export const estimateRadiation: EstimateRadiationFn = (sun, cloud) => {
  if (sun.elevation <= 0) return { ghi: 0, direct: 0, diffuse: 0 };
  const c = clamp(Number.isFinite(cloud) ? cloud : 1, 0, 1);
  const ghi = clearSkyGhi(sun.elevation) * (1 - 0.75 * c ** 3.4);
  return { ghi, ...splitGhi(sun, ghi) };
};

/** Magnus form (WMO 2008, Sonntag 1990 constants), hPa over water. */
export function vapourPressureHpa(ta: number, rh: number): number {
  return (clamp(rh, 0, 100) / 100) * 6.112 * Math.exp((17.62 * ta) / (243.12 + ta));
}

/**
 * Brutsaert's clear-sky emissivity (e in hPa) blended with cloud as Crawford
 * and Duchon do, with the forecast cloud fraction in place of their measured
 * cloudiness, which the forecast cannot provide.
 */
export function longwaveDown(ta: number, rh: number, cloud: number): number {
  const tk = ta + KELVIN;
  const c = clamp(cloud, 0, 1);
  const epsClear = 1.24 * (vapourPressureHpa(ta, rh) / tk) ** (1 / 7);
  return (c + (1 - c) * epsClear) * SIGMA * tk ** 4;
}

/** Standing person; β in degrees (Jendritzky et al. 1990, VDI 3787-2). */
export function projectedAreaFactor(elevation: number): number {
  return 0.308 * Math.cos(elevation * (0.998 - (elevation * elevation) / 50000) * DEG);
}

export interface MrtParts {
  tmrt: number;
  lwDown: number;
  lwUp: number;
  fp: number;
  beamNormal: number;
}

/**
 * Two-direction (sky and ground) integral radiation for a person in the open,
 * before the night cap. Ground longwave assumes the surface is at air
 * temperature, as the forecast carries no surface temperature.
 */
export function meanRadiantTempParts(
  ta: number,
  rh: number,
  cloud: number,
  sun: SunPosition,
  rad: Radiation,
): MrtParts {
  const tk = ta + KELVIN;
  const lwDown = longwaveDown(ta, rh, cloud);
  const lwUp = EMISSIVITY_BODY * SIGMA * tk ** 4;
  const direct = nonNeg(rad.direct);
  const diffuse = nonNeg(rad.diffuse);
  const ghi = nonNeg(rad.ghi);
  let beamNormal = 0;
  let fp = 0;
  if (sun.elevation >= MIN_SUN_ELEVATION) {
    beamNormal = rad.dni !== undefined ? nonNeg(rad.dni) : direct / Math.sin(sun.elevation * DEG);
    fp = projectedAreaFactor(sun.elevation);
  }
  const absorbedLw = 0.5 * lwDown + 0.5 * lwUp;
  const absorbedSw = (ABSORPTIVITY_SW / EMISSIVITY_BODY) * (0.5 * diffuse + 0.5 * ALBEDO * ghi + fp * beamNormal);
  const tmrt = ((absorbedLw + absorbedSw) / SIGMA) ** 0.25 - KELVIN;
  return { tmrt, lwDown, lwUp, fp, beamNormal };
}

/** °C. With the sun below the beam threshold, Tmrt stays within NIGHT_CAP_K of air temperature. */
export const meanRadiantTemp: MeanRadiantTempFn = (ta, rh, cloud, sun, rad) => {
  const { tmrt } = meanRadiantTempParts(ta, rh, cloud, sun, rad);
  return sun.elevation < MIN_SUN_ELEVATION ? Math.max(tmrt, ta - NIGHT_CAP_K) : tmrt;
};

/** m/s at 1.1 m from m/s at 10 m. */
export const windAtBody: WindAtBodyFn = (wind10) => nonNeg(wind10) * WIND_BODY_FACTOR;
