// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { patchSettings, settings } from '../../data/store';
import type { Clock, TempUnit, WindUnit } from '../../data/units';
import { Segmented } from '../../components/Segmented';

export function UnitsSection() {
  const u = settings.value.units;
  return (
    <>
    <h2 class="group-title">Units</h2>
    <div class="card" style={{ display: 'grid', gap: '12px' }}>
      <Segmented<TempUnit> label="Temperature" value={u.temp} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} onChange={(temp) => patchSettings({ units: { ...u, temp } })} />
      <Segmented<WindUnit> label="Wind speed" value={u.wind} options={[{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }, { value: 'ms', label: 'm/s' }]} onChange={(wind) => patchSettings({ units: { ...u, wind } })} />
      <Segmented<Clock> label="Clock" value={u.clock} options={[{ value: '24', label: '24-hour' }, { value: '12', label: '12-hour' }]} onChange={(clock) => patchSettings({ units: { ...u, clock } })} />
    </div>
    </>
  );
}
