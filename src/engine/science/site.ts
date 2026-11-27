// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Where a place is walked: an open site (the model's default), a city street,
 * or mostly in shade. Spike for issue #86; see
 * docs/innovation/sprint-07-site-exposure.md for the question and evidence.
 *
 * The street is an infinite canyon as tall as it is wide (H/W = 1), the person
 * on its centre line. From there the sky view factor is cos(atan(2H/W)) ≈ 0.45
 * (Oke 1988, Street design and urban canopy layer climate, Energy and
 * Buildings 11, 103–113; Lindberg, Holmer and Thorsson 2008, SOLWEIG 1.0,
 * Int J Biometeorol 52, 697–713, for the same split of sky and wall
 * radiation in Tmrt). Walls are taken at air temperature, as the
 * ground already is. "Mostly in shade" only removes the beam, as
 * thermal-model.md §6.2 proposes (`fp·I → 0`); the sky above stays open.
 */

export type Site = 'open' | 'street' | 'shade';

export const SITE_IDS: readonly Site[] = ['open', 'street', 'shade'];

export interface SiteGeometry {
  /** Share of the upper hemisphere that is sky, 0..1; the rest is wall. */
  skyView: number;
  /** 10 m wind multiplier for the street's shelter. */
  windFactor: number;
}

/** Canyon height over width; sets the sky view and when the sun reaches the pavement. */
export const STREET_ASPECT = 1;

/**
 * Wind across a canyon is sheltered at pedestrian height; along the street it
 * can be channelled above the open-site value. 0.6 is a judgement, not a
 * measurement; the write-up reruns the evidence at 0.4 and 0.8.
 */
export const STREET_WIND_FACTOR = 0.6;

export const SITES: Record<Site, SiteGeometry> = {
  open: { skyView: 1, windFactor: 1 },
  street: { skyView: Math.cos(Math.atan(2 * STREET_ASPECT)), windFactor: STREET_WIND_FACTOR },
  shade: { skyView: 1, windFactor: 1 },
};

const DEG = Math.PI / 180;

/**
 * Share of the direct beam that reaches the person, 0..1. In the street it is
 * averaged over street orientations, because the forecast gives no azimuth
 * and places carry no street direction: the centre line is sunlit when
 * tan(β) ≥ 2H/W·|sin φ|, φ being the angle between sun and street, so over a
 * uniform φ the lit share is (2/π)·asin(tan β / (2H/W)).
 */
export function beamFraction(site: Site, elevation: number): number {
  if (site === 'open') return 1;
  if (site === 'shade' || !(elevation > 0)) return 0;
  const r = Math.tan(Math.min(elevation, 89.9) * DEG) / (2 * STREET_ASPECT);
  return r >= 1 ? 1 : (2 / Math.PI) * Math.asin(r);
}

/** Anything unrecognised is the open site, so older saved places keep today's advice. */
export function siteOf(x: unknown): Site {
  return x === 'street' || x === 'shade' ? x : 'open';
}
