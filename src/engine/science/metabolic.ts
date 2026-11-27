// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * Metabolic rate, external work, walking and riding speed per activity and
 * effort. docs/science/thermal-model.md §5.
 *
 * Sources:
 * - Ainsworth, B. E. et al. (2011). 2011 Compendium of Physical Activities.
 *   Med Sci Sports Exerc 43(8), 1575–1581, doi:10.1249/MSS.0b013e31821ece12.
 *   Codes are quoted next to each value. The 2024 update (Herrmann, S. D. et al.,
 *   J Sport Health Sci 13(1), 6–12, PMC10818145) keeps the same MET definition.
 * - ISO 8996:2021 and ASHRAE 55-2023 for standing relaxed (1.2 met).
 * - ISO 11079:2007 limits (58 ≤ M ≤ 400 W/m², walking speed between
 *   min(0.0052·(M − 58), 1.2) and 1.2 m/s), as applied by pythermalcomfort
 *   4.8.1 `ireq` (© 2019 Federico Tartarini, MIT licence).
 */

import type { Activity, Effort } from '../types';
import type { Metabolic, MetabolicRateFn } from './types';

/**
 * One Compendium MET (3.5 ml O₂/kg/min ≈ 1 kcal/kg/h) for a 70 kg adult with
 * 1.8 m² of skin: 70 × 1.163 / 1.8 ≈ 45 W/m². Thermal models use 58.15 W/m²
 * per met; mixing the two would overstate every activity by 30%.
 */
export const COMPENDIUM_MET_W_M2 = 45;
/** ISO 7730 / ASHRAE 55 met, seated rest. */
export const ISO_MET_W_M2 = 58.15;

export const M_MAX = 400;
export const WALK_MAX = 1.2;

const KMH = 1 / 3.6;

interface Rate {
  m: number;              // W/m², before the 400 clamp
  walk: number;           // m/s, before the ISO 11079 bounds
  ride: number;           // m/s
  /** Share of M done as mechanical work on the pedals. */
  work: number;
  source: string;
}

const compendium = (met: number): number => met * COMPENDIUM_MET_W_M2;

const WALK_4: Rate = { m: compendium(3.0), walk: 4 * KMH, ride: 0, work: 0, source: 'Compendium 17170 walking 2.5 mph (4.0 km/h), level, firm surface, 3.0 MET' };
const WALK_48: Rate = { m: compendium(3.5), walk: 4.8 * KMH, ride: 0, work: 0, source: 'Compendium 17190 walking 2.8–3.2 mph (4.8 km/h), level, moderate pace, firm surface, 3.5 MET' };
const STAND: Rate = { m: 1.2 * ISO_MET_W_M2, walk: 0, ride: 0, work: 0, source: 'ISO 8996 / ASHRAE 55 standing relaxed, 1.2 met' };

/** Time-weighted mix of walking and standing, for days spent partly waiting. */
function mix(walkShare: number, walking: Rate, source: string): Rate {
  return {
    m: walkShare * walking.m + (1 - walkShare) * STAND.m,
    walk: walkShare * walking.walk,
    ride: 0,
    work: 0,
    source,
  };
}

const TRANSPORT = mix(0.5, WALK_4, 'time-weighted: 50% walking 4 km/h (17170), 50% standing');

/** Activities whose rate does not depend on effort. */
export const METABOLIC: Record<Exclude<Activity, 'running' | 'cycling' | 'hiking'>, Rate> = {
  walking: WALK_48,
  standing: STAND,
  transport: TRANSPORT,
  // ACTIVITY_EXPOSURE already limits the time outside to the commute legs.
  office: { ...TRANSPORT, source: 'as transport' },
  indoors: { ...WALK_4, source: 'walking to the shop: ' + WALK_4.source },
  night: mix(0.3, WALK_48, 'time-weighted: 30% walking 4.8 km/h (17190), 70% standing'),
};

// Cycling: about a fifth of the energy goes into the pedals (gross efficiency ≈ 0.2).
const CYCLE_WORK = 0.2;

export const METABOLIC_EFFORT: Record<'running' | 'cycling' | 'hiking', Record<Effort, Rate>> = {
  running: {
    easy: { m: compendium(8.3), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 12030 running 5 mph (8.0 km/h), 8.3 MET' },
    steady: { m: compendium(9.8), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 12050 running 6 mph (9.7 km/h), 9.8 MET' },
    hard: { m: compendium(11.0), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 12060 running 7 mph (11.3 km/h), 11.0 MET' },
  },
  cycling: {
    easy: { m: compendium(4.0), walk: 0, ride: 4, work: CYCLE_WORK, source: 'Compendium 01010 bicycling < 10 mph (16 km/h), leisure, 4.0 MET' },
    steady: { m: compendium(6.8), walk: 0, ride: 5, work: CYCLE_WORK, source: 'Compendium 01011 bicycling to/from work, self-selected pace, 6.8 MET' },
    hard: { m: compendium(10.0), walk: 0, ride: 6.5, work: CYCLE_WORK, source: 'Compendium 01040 bicycling 14–15.9 mph (22.5–25.6 km/h), vigorous, 10.0 MET' },
  },
  hiking: {
    easy: { m: compendium(5.3), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 17082 hiking or walking at a normal pace through fields and hillsides, 5.3 MET' },
    steady: { m: compendium(6.0), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 17080 hiking, cross country, 6.0 MET' },
    hard: { m: compendium(7.0), walk: WALK_MAX, ride: 0, work: 0, source: 'Compendium 17010 backpacking, 7.0 MET' },
  },
};

/** ISO 11079's lower walking-speed bound, capped so it never exceeds the 1.2 m/s ceiling. */
export const minWalk = (m: number): number => Math.min(WALK_MAX, Math.max(0, 0.0052 * (m - 58)));

function rateFor(activity: Activity, effort: Effort): Rate {
  switch (activity) {
    case 'running':
    case 'cycling':
    case 'hiking':
      return METABOLIC_EFFORT[activity][effort];
    default:
      return METABOLIC[activity];
  }
}

export const metabolicRate: MetabolicRateFn = (activity: Activity, effort: Effort = 'steady'): Metabolic => {
  const r = rateFor(activity, effort);
  const m = Math.min(r.m, M_MAX);
  // For a cyclist the bound stands in for limbs pumping air through the clothing.
  const walk = Math.min(WALK_MAX, Math.max(r.walk, minWalk(m)));
  return { m, w: r.work * m, walk, ride: r.ride, clampedM: r.m > M_MAX };
};
