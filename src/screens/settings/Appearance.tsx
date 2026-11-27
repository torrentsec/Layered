// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { patchSettings, settings, type Theme } from '../../data/store';
import { Segmented } from '../../components/Segmented';

export function AppearanceSection() {
  const s = settings.value;
  return (
    <>
    <h2 class="group-title">Appearance</h2>
    <div class="card">
      <Segmented<Theme> label="Theme" value={s.theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={(theme) => patchSettings({ theme })} />
    </div>
    </>
  );
}
