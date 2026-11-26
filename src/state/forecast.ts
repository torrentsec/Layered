// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { computed, signal } from '@preact/signals';
import { getForecast } from '../data/cache';
import type { Forecast } from '../data/forecast-types';
import type { Place } from '../data/openmeteo';
import { here, places, settings } from '../data/store';

export const currentPlace = computed<Place | null>(() => {
  const id = settings.value.placeId;
  if (id === 'here' || !id) return here.value ?? (id ? null : places.value[0] ?? null);
  return places.value.find((p) => p.id === id) ?? here.value ?? null;
});

export interface ForecastState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  forecast?: Forecast;
  stale?: boolean;
  error?: string;
  placeKey?: string;
}

export const forecastState = signal<ForecastState>({ status: 'idle' });

const keyOf = (p: Place) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

export async function loadForecast(force = false): Promise<void> {
  const p = currentPlace.value;
  if (!p) {
    forecastState.value = { status: 'idle' };
    return;
  }
  const key = keyOf(p);
  const prev = forecastState.value;
  forecastState.value = { ...prev, status: prev.placeKey === key && prev.forecast ? 'ready' : 'loading', placeKey: key };
  try {
    const { forecast, stale } = await getForecast(p.lat, p.lon, force);
    if (keyOf(currentPlace.value ?? p) !== key) return;
    forecastState.value = { status: 'ready', forecast, stale, placeKey: key };
  } catch {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    forecastState.value = {
      status: 'error',
      placeKey: key,
      error: offline
        ? 'You’re offline and there’s no saved forecast for this place yet.'
        : 'The forecast service isn’t answering right now. Try again in a minute.',
    };
  }
}
