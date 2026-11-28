// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Turns what the band engine already knows about a person into the science
 * engine's clo bias (docs/science/thermal-model.md §8.2, §8.3), so it is
 * personal from the first day the flag is on.
 */

import { sensitivityOffset, type ComfortProfile } from '../comfort';
import type { Activity, Advice, Rating } from '../types';
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
  return migrateOffsetToClo(sensitivityOffset(comfort) + (Number.isFinite(manualOffset) ? manualOffset : 0));
}

const isVote = (v: unknown): v is -1 | 0 | 1 => v === -1 || v === 0 || v === 1;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * What a new vote should remember of the day's advice (tech debt D8): the
 * advised outfit's basic clo and the model's target before the personal bias,
 * so the vote can teach the real gap. Empty for band advice or when the outfit
 * could not be summed. Rounded to 0.01 clo, well under one thickness step.
 */
export function ratingClo(advice: Pick<Advice, 'science'> | undefined): Pick<Rating, 'wornClo' | 'targetClo'> {
  const sci = advice?.science;
  const worn = sci?.outfit?.basic;
  const target = sci ? sci.target.icl - sci.target.bias : undefined;
  if (!finite(worn) || !finite(target)) return {};
  const round = (v: number) => Math.round(v * 100) / 100;
  return { wornClo: round(worn), targetClo: round(target) };
}

/** The real gap when the vote carries both clo values, else the plain step (§8.3). */
function voteOpts(r: Rating): Parameters<typeof updateBias>[3] {
  const opts: NonNullable<Parameters<typeof updateBias>[3]> = {};
  if (MOSTLY_INDOORS.includes(r.activity)) opts.mostlyIndoors = true;
  if (finite(r.wornClo) && finite(r.targetClo)) {
    opts.wornIcl = r.wornClo;
    opts.modelIcl = r.targetClo;
  }
  return opts;
}

/**
 * The prior updated by every stored vote, oldest first, so drift between votes
 * is counted. `onDay` sees the state at the end of each rated day, which lets
 * the learned card carry its hysteresis in the same single pass.
 */
export function replayBias(prior: BiasState, ratings: readonly Rating[], onDay?: (state: BiasState) => void): BiasState {
  // A stable sort keeps same-day votes in stored order; updateBias makes that order irrelevant anyway.
  const votes = ratings
    .filter((r) => r && isVote(r.rating) && !r.voteCleared)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let state = prior;
  votes.forEach((r, i) => {
    state = updateBias(state, r.rating, r.date, voteOpts(r));
    if (onDay && votes[i + 1]?.date !== r.date) onDay(state);
  });
  return state;
}
