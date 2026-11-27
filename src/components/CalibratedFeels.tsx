// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import '../styles/feels-calibration.css';
import { actualRange } from '../engine/actual';
import type { Advice } from '../engine/types';
import { familiarRange, type CalibratedReading } from '../data/feels-calibration';
import { fmtTemp, type Units } from '../data/units';
import { FeelsActual } from './AdviceParts';

interface Props {
  advice: Advice;
  reading: CalibratedReading;
  familiar: boolean;
  units: Units;
  context: string;
}

/**
 * The readout under the poster for a wording on trial (spike #84). With the
 * familiar number on top the range below uses it too, so the two never
 * disagree on screen.
 */
export function CalibratedFeels({ advice, reading, familiar, units, context }: Props) {
  const t = (c: number) => fmtTemp(c, units.temp);
  const fam = familiar ? familiarRange(advice.hours) : null;
  const actual = actualRange(advice.hours);
  return (
    <div>
      <div class="feels num" style={{ position: 'relative' }}><span class="visually-hidden">{reading.label} </span>{reading.text}</div>
      {reading.note && <div class="feels-note">{reading.note}</div>}
      {fam ? (
        <div class="feels-label">
          <span class="nowrap">Feels {t(fam.min)} to {t(fam.max)}</span>
          {actual && <>{' · '}<span class="nowrap">actual {t(actual.min)} to {t(actual.max)}</span></>}
          <span class="feels-context">{context}</span>
        </div>
      ) : (
        <FeelsActual advice={advice} units={units} context={context} />
      )}
    </div>
  );
}
