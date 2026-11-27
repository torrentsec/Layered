// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

// Open-Meteo /v1/forecast for central London, trimmed to the hours around sunrise on 26 November.
// The 10:00 humidity and radiation are null to stand for a gap in the upstream model run.

import type { parseForecast } from './forecast-types';

type Raw = Parameters<typeof parseForecast>[0];

const DAILY: Raw['daily'] = {
  time: ['2026-11-26'],
  sunrise: ['2026-11-26T07:35'],
  sunset: ['2026-11-26T15:58'],
  temperature_2m_max: [7.4],
  temperature_2m_min: [3.1],
  apparent_temperature_max: [4.2],
  apparent_temperature_min: [-0.6],
  precipitation_probability_max: [70],
  precipitation_sum: [2.3],
  uv_index_max: [0.9],
  wind_gusts_10m_max: [41.8],
  weather_code: [80],
};

const BASE = {
  time: ['2026-11-26T06:00', '2026-11-26T07:00', '2026-11-26T08:00', '2026-11-26T09:00', '2026-11-26T10:00'],
  temperature_2m: [3.4, 3.6, 4.1, 5.0, 5.9],
  apparent_temperature: [-0.2, 0.0, 0.6, 1.7, 2.6],
  precipitation_probability: [10, 8, 5, 12, 30],
  precipitation: [0.0, 0.0, 0.0, 0.0, 0.1],
  snowfall: [0.0, 0.0, 0.0, 0.0, 0.0],
  weather_code: [2, 2, 3, 3, 80],
  wind_speed_10m: [14.2, 14.8, 15.5, 16.9, 18.0],
  wind_gusts_10m: [27.4, 28.1, 30.2, 33.5, 36.0],
  uv_index: [0.0, 0.0, 0.05, 0.3, 0.6],
  is_day: [0, 0, 1, 1, 1],
  visibility: [18000, 19500, 22000, 24000, 21000],
};

/** A current answer, with every variable `HOURLY_VARS` asks for. */
export const OPEN_METEO_LONDON: Raw = {
  latitude: 51.5,
  longitude: -0.12,
  timezone: 'Europe/London',
  utc_offset_seconds: 0,
  hourly: {
    ...BASE,
    relative_humidity_2m: [88, 87, 85, 82, null],
    cloud_cover: [62, 70, 81, 95, 100],
    shortwave_radiation: [0.0, 0.0, 12.0, 58.0, null],
    direct_radiation: [0.0, 0.0, 3.0, 14.0, null],
    diffuse_radiation: [0.0, 0.0, 9.0, 44.0, null],
    direct_normal_irradiance: [0.0, 0.0, 41.6, 75.3, null],
  },
  daily: DAILY,
};

/** The same answer as a release before the science inputs were requested would have seen it. */
export const OPEN_METEO_LONDON_LEGACY: Raw = {
  ...OPEN_METEO_LONDON,
  hourly: BASE,
};
