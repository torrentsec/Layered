// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Hour } from '../types';
import type { UtciResult, WeatherPlace } from './types';
import { weatherUtci } from './utci';
import { hourToWeather } from './weather';

/**
 * UTCI for one forecast hour, through the same conversion the advice uses, so
 * an hour inside the window reads exactly what "Why this?" reads for it.
 */
export function hourUtci(h: Hour, place: WeatherPlace): UtciResult {
  return weatherUtci(hourToWeather(h, place));
}
