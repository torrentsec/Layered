// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { patchSettings, settings } from '../../data/store';
import { engineOf, type EngineChoice } from '../../data/engine-choice';
import { Segmented } from '../../components/Segmented';

const LABEL = 'Work out what to wear with';

const OPTIONS: { value: EngineChoice; label: string }[] = [
  { value: 'science', label: 'Thermal model' },
  { value: 'bands', label: 'Simple bands' },
];

const DETAIL: Record<EngineChoice, string> = {
  science: 'Weighs sun, wind, damp air and how long you’re out. The default.',
  bands: 'Picks from the feels-like temperature, as before. Simple bands goes away in a later update.',
};

export function EngineSection() {
  const engine = engineOf(settings.value);
  return (
    <>
    <h2 class="group-title">Advice</h2>
    <div class="card">
      {/* The segmented control's own legend is hidden, so this is the visible copy of it. */}
      <p aria-hidden="true" style={{ margin: '0 0 8px' }}>{LABEL}</p>
      <Segmented<EngineChoice> label={LABEL} value={engine} options={OPTIONS} onChange={(e) => patchSettings({ engine: e })} />
      <p class="small-print" aria-live="polite" style={{ margin: '8px 0 0' }}>{DETAIL[engine]}</p>
    </div>
    </>
  );
}
