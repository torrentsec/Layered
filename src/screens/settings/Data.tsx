// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { DEFAULT_SETTINGS, exportBundle, importBundle, settings } from '../../data/store';
import { toast } from '../../components/Toast';

export function DataSection() {
  const s = settings.value;
  const today = new Date().toISOString().slice(0, 10);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBundle(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `layered-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      importBundle(JSON.parse(await file.text()));
      toast('Imported');
    } catch (e) {
      toast(e instanceof SyntaxError ? 'That file isn’t valid JSON' : (e as Error).message);
    }
  };

  return (
    <>
    <h2 class="group-title">Your data</h2>
    <div class="group">
      <button type="button" class="row-item plain" onClick={doExport}><span class="grow link">Export as JSON</span></button>
      <label class="row-item plain" style={{ cursor: 'pointer' }}>
        <span class="grow link">Import from JSON</span>
        <input type="file" accept="application/json,.json" class="visually-hidden" onChange={(e) => void doImport(e.currentTarget.files?.[0])} />
      </label>
      <button
        type="button"
        class="row-item plain"
        onClick={() => {
          if (!confirm('Reset all settings to their defaults? Places, wardrobe and trips are kept.')) return;
          settings.value = { ...DEFAULT_SETTINGS, placeId: s.placeId, notify: s.notify };
        }}
      >
        <span class="grow" style={{ color: 'var(--red-ink)' }}>Reset settings</span>
      </button>
    </div>
    <p class="group-foot">Everything stays on this device unless you turn on sync.</p>
    </>
  );
}
