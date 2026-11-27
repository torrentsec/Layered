// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import '../styles/feels-calibration.css';
import { actualRange } from '../engine/actual';
import type { Advice } from '../engine/types';
import type { CalibratedReading } from '../data/feels-calibration';
import { fmtTemp, type Units } from '../data/units';

interface Props {
  advice: Advice;
  reading: CalibratedReading;
  units: Units;
  context: string;
}

/**
 * The readout under the poster: the real temperature, then how it feels. The
 * range line gives only the air range, because the feels figure is already in
 * the note and the hourly strip; repeating it made the same number show twice.
 */
export function CalibratedFeels({ advice, reading, units, context }: Props) {
  const actual = actualRange(advice.hours);
  return (
    <div>
      <div class="feels num" style={{ position: 'relative' }}><span class="visually-hidden">{reading.label} </span>{reading.text}</div>
      {reading.note && <div class="feels-note">{reading.note}</div>}
      {actual && (
        <div class="feels-label">
          <span class="nowrap">Air {fmtTemp(actual.min, units.temp)} to {fmtTemp(actual.max, units.temp)}</span>
          <span class="feels-context">{context}</span>
        </div>
      )}
    </div>
  );
}
