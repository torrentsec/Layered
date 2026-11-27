// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS, exportBundle, importBundle, settings } from '../../data/store';
import { clearStorage, deleteServerCopy, wipeDevice } from '../../data/sync';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';

type Wipe = 'confirm' | 'working' | 'server-failed' | 'done';

// Stored state can be rewritten by a late effect while the confirmation shows, so clear once more on the way out.
function startAgain() {
  clearStorage();
  location.replace(location.pathname + location.search);
}

export function DataSection() {
  const s = settings.value;
  const today = new Date().toISOString().slice(0, 10);
  const [wipe, setWipe] = useState<Wipe | null>(null);

  const doWipe = async (skipServer: boolean) => {
    setWipe('working');
    if (!skipServer) {
      try {
        await deleteServerCopy();
      } catch {
        // Wiping now would lose the only key to the server copy, so ask first.
        setWipe('server-failed');
        return;
      }
    }
    await wipeDevice();
    setWipe('done');
    setTimeout(startAgain, 2500);
  };

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
      <button type="button" class="row-item plain" onClick={() => setWipe('confirm')}>
        <span class="grow" style={{ color: 'var(--red-ink)' }}>Delete my data</span>
      </button>
    </div>
    <p class="group-foot">Everything stays on this device unless you turn on sync.</p>

    <Sheet open={wipe !== null} title={wipe === 'done' ? 'Your data is deleted' : 'Delete my data?'} onClose={() => (wipe === 'done' ? startAgain() : wipe !== 'working' && setWipe(null))}>
      {wipe === 'done' ? (
        <>
          <p role="status">Everything has been removed from this device{s.syncCode ? ' and the sync server' : ''}. Layered will start again as new.</p>
          <div class="sheet-actions">
            <button type="button" class="btn" onClick={startAgain}>Start again</button>
          </div>
        </>
      ) : wipe === 'server-failed' ? (
        <>
          <p role="alert">Couldn’t delete the copy on the sync server. Check your connection and try again.</p>
          <p>If you delete from this device only, the server copy stays and this device forgets the code that opens it.</p>
          <div class="sheet-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" class="btn secondary" onClick={() => void doWipe(true)}>This device only</button>
            <button type="button" class="btn danger" onClick={() => void doWipe(false)}>Try again</button>
          </div>
        </>
      ) : (
        <>
          <p>This permanently deletes your places, wardrobe, trips, feedback and settings from this device.</p>
          {s.syncCode && <p>It also deletes the synced copy on the server. Your other devices keep their own data but can no longer sync.</p>}
          <p>Morning notifications on this device stop. If you want a copy, export it first. This can’t be undone.</p>
          <div class="sheet-actions">
            <button type="button" class="btn secondary" disabled={wipe === 'working'} onClick={() => setWipe(null)}>Cancel</button>
            <button type="button" class="btn danger" disabled={wipe === 'working'} onClick={() => void doWipe(false)}>
              {wipe === 'working' ? 'Deleting…' : 'Delete everything'}
            </button>
          </div>
        </>
      )}
    </Sheet>
    </>
  );
}
