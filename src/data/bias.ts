// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { BiasState } from '../engine/science/types';
import { cloBias } from './store';

/** The clo to add to the science engine's clothing target; positive means dress warmer. */
export function currentBias(): number {
  return cloBias.value.mean;
}

/** The whole learned state, for explanations that say how many votes it rests on. */
export function biasState(): BiasState {
  return cloBias.value;
}
