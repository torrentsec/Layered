// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Hour } from './types';
import { fmt24, type TimeFormatter } from './time';

export type HeadsUpId = 'ice' | 'storm' | 'uv' | 'heat' | 'fog';

export interface HeadsUp {
  id: HeadsUpId;
  title: string;
  detail: string;
}

export const HEADSUP = { iceTemp: 1, freeze: 0, iceLookbackHours: 6, storm: 70, uv: 8, heat: 28, fogVisibility: 1000 } as const;

const FOG_CODES = new Set([45, 48]);

/**
 * Advisory flags derived from the forecast. These are not official warnings;
 * the UI labels them as such and links to the Met Office.
 */
export function headsUps(hours: Hour[], fmt: TimeFormatter = fmt24): HeadsUp[] {
  const out: HeadsUp[] = [];

  const iceIdx = hours.findIndex((h, i) => {
    if (h.temp <= HEADSUP.iceTemp && (h.precip > 0 || h.snow > 0)) return true;
    if (h.temp > HEADSUP.freeze) return false;
    // Standing water from earlier rain freezes once the temperature drops.
    return hours.slice(Math.max(0, i - HEADSUP.iceLookbackHours), i).some((p) => p.precip > 0);
  });
  if (iceIdx >= 0) {
    out.push({ id: 'ice', title: 'Ice risk', detail: `Freezing surfaces likely from ${fmt(hours[iceIdx].time)}. Take care on pavements and bike lanes.` });
  }

  const storm = hours.reduce<Hour | undefined>((m, h) => (h.gusts >= HEADSUP.storm && (!m || h.gusts > m.gusts) ? h : m), undefined);
  if (storm) out.push({ id: 'storm', title: 'Stormy', detail: `Gusts up to ${Math.round(storm.gusts)} km/h around ${fmt(storm.time)}.` });

  const uv = hours.reduce<Hour | undefined>((m, h) => (h.uv >= HEADSUP.uv && (!m || h.uv > m.uv) ? h : m), undefined);
  if (uv) out.push({ id: 'uv', title: 'Extreme UV', detail: `UV ${Math.round(uv.uv)} around ${fmt(uv.time)}. Cover up and find shade at midday.` });

  const heat = hours.reduce<Hour | undefined>((m, h) => (h.feels >= HEADSUP.heat && (!m || h.feels > m.feels) ? h : m), undefined);
  if (heat) out.push({ id: 'heat', title: 'Heat', detail: `Feels like ${Math.round(heat.feels)}° around ${fmt(heat.time)}. Drink water and keep out of the sun.` });

  const fog = hours.find((h) => FOG_CODES.has(h.code) || (h.visibility !== undefined && h.visibility < HEADSUP.fogVisibility));
  if (fog) out.push({ id: 'fog', title: 'Fog', detail: `Poor visibility from ${fmt(fog.time)}. Lights on if you're cycling.` });

  return out;
}
