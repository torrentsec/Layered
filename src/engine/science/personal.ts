// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Turns what the band engine already knows about a person into the science
 * engine's clo bias (docs/science/thermal-model.md §8.2, §8.3), so it is
 * personal from the first day the flag is on.
 */

import { SENSITIVITY_OFFSET, type ComfortProfile } from '../comfort';
import type { Activity, Rating } from '../types';
import { migrateOffsetToClo, updateBias } from './bias';
import type { BiasState } from './types';

/** Votes from these days mostly describe time indoors, so they count for half (§8.3). */
export const MOSTLY_INDOORS: readonly Activity[] = ['office', 'indoors'];

/**
 * Prior from the °C offsets a person set themselves. The learned °C offset is
 * left out because the ratings behind it are replayed, and counting them twice
 * would overstate the bias. Per-activity preferences belong to the per-activity
 * offsets of §8.1, not to this one scalar.
 */
export function biasPrior(comfort: ComfortProfile, manualOffset: number): BiasState {
  // Imported or synced profiles may carry a sensitivity from a later version.
  const sensitivity = SENSITIVITY_OFFSET[comfort.sensitivity] ?? 0;
  return migrateOffsetToClo(sensitivity + (Number.isFinite(manualOffset) ? manualOffset : 0));
}

const isVote = (v: unknown): v is -1 | 0 | 1 => v === -1 || v === 0 || v === 1;

/** The prior updated by every stored vote, oldest first, so drift between votes is counted. */
export function replayBias(prior: BiasState, ratings: readonly Rating[]): BiasState {
  // A stable sort keeps same-day votes in stored order; updateBias makes that order irrelevant anyway.
  const votes = ratings.filter((r) => r && isVote(r.rating)).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return votes.reduce(
    (state, r) => updateBias(state, r.rating, r.date, MOSTLY_INDOORS.includes(r.activity) ? { mostlyIndoors: true } : {}),
    prior,
  );
}
