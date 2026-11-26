// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Place } from './openmeteo';

export class LocationError extends Error {}

/** Coordinates are rounded to ~1 km; nothing finer is needed and nothing finer is kept. */
export function locate(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocationError('This browser can’t share your location. Search for a place instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          id: 'here',
          name: 'Current location',
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lon: Math.round(pos.coords.longitude * 100) / 100,
          kind: 'here',
        }),
      (err) =>
        reject(
          new LocationError(
            err.code === err.PERMISSION_DENIED
              ? 'Location is turned off for Layered. Allow it in your browser settings, or search for a place.'
              : 'Couldn’t find your location just now. Try again, or search for a place.',
          ),
        ),
      { maximumAge: 30 * 60 * 1000, timeout: 12_000 },
    );
  });
}
