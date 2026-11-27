// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useState } from 'preact/hooks';
import { settings } from '../../data/store';
import { createSyncCode, formatCode, stopSyncing, syncedLabel, syncNow, useSyncCode } from '../../data/sync';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';

type Busy = null | 'create' | 'use' | 'sync' | 'stop';

export function SyncSection() {
  const s = settings.value;
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [typed, setTyped] = useState('');
  const [alsoDelete, setAlsoDelete] = useState(true);

  // One runner so every action reports success and failure the same way.
  const run = async (kind: Exclude<Busy, null>, action: () => Promise<string>): Promise<boolean> => {
    setBusy(kind);
    setStatus(null);
    try {
      const done = await action();
      toast(done);
      return true;
    } catch (e) {
      setStatus((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Copied');
    } catch {
      setStatus('Couldn’t copy. Select the code and copy it yourself.');
    }
  };

  return (
    <>
    <h2 class="group-title">Sync</h2>
    {s.syncCode ? (
      <div class="group" aria-busy={busy !== null}>
        <div class="row-item plain">
          <span class="grow">
            Sync code
            <span class="sub" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '17px', color: 'var(--ink)', letterSpacing: '0.08em', userSelect: 'all' }}>
              {formatCode(s.syncCode)}
            </span>
          </span>
          <button type="button" class="btn secondary" onClick={() => void copy(formatCode(s.syncCode!))}>Copy</button>
        </div>
        <button type="button" class="row-item plain" disabled={busy !== null} onClick={() => void run('sync', async () => ((await syncNow()) === 'pulled' ? 'Updated from your other device' : 'Synced'))}>
          <span class="grow link">{busy === 'sync' ? 'Syncing…' : 'Sync now'}</span>
          <span class="meta">{s.syncedAt ? `Last synced ${syncedLabel(s.syncedAt, s.units.clock)}` : 'Not synced yet'}</span>
        </button>
        <button type="button" class="row-item plain" disabled={busy !== null} onClick={() => setStopping(true)}>
          <span class="grow" style={{ color: 'var(--red-ink)' }}>Stop syncing</span>
        </button>
      </div>
    ) : (
      <div class="group" aria-busy={busy !== null}>
        <button type="button" class="row-item plain" disabled={busy !== null} onClick={() => void run('create', async () => (await createSyncCode(), 'Sync code created'))}>
          <span class="grow link">{busy === 'create' ? 'Creating…' : 'Create sync code'}</span>
        </button>
        <button type="button" class="row-item plain" disabled={busy !== null} onClick={() => { setTyped(''); setStatus(null); setEntering(true); }}>
          <span class="grow link">Use a code</span>
        </button>
      </div>
    )}
    <p class="group-foot" role="status">
      {status ?? (s.syncCode
        ? 'Enter this code on your other devices. Whoever syncs last wins.'
        : 'A sync code copies your settings, wardrobe, places, trips and feedback to another device. No account needed.')}
    </p>

    <Sheet open={entering} title="Use a sync code" onClose={() => setEntering(false)}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run('use', async () => (await useSyncCode(typed), 'Synced from your other device'))) setEntering(false);
        }}
      >
        <p>This replaces what’s on this device with the copy saved under the code.</p>
        <label class="field">
          <span>Sync code</span>
          <input
            type="text"
            value={typed}
            onInput={(e) => setTyped(e.currentTarget.value)}
            autocomplete="off"
            autocapitalize="characters"
            spellcheck={false}
            placeholder="ABCDE-23456"
            aria-describedby="sync-use-error"
          />
        </label>
        <p id="sync-use-error" class="small-print" role="alert">{entering && status}</p>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" onClick={() => setEntering(false)}>Cancel</button>
          <button type="submit" class="btn" disabled={busy !== null || !typed.trim()}>{busy === 'use' ? 'Syncing…' : 'Use code'}</button>
        </div>
      </form>
    </Sheet>

    <Sheet open={stopping} title="Stop syncing?" onClose={() => setStopping(false)}>
      <p>This device keeps its data but stops sharing changes. Your other devices keep the code.</p>
      <label class="row-item plain" style={{ padding: '8px 0', color: 'var(--ink)' }}>
        <input type="checkbox" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.currentTarget.checked)} style={{ width: '22px', height: '22px' }} />
        <span class="grow">Also delete the copy on the server<span class="sub">Other devices can no longer sync with this code.</span></span>
      </label>
      <p class="small-print" role="alert">{stopping && status}</p>
      <div class="sheet-actions">
        <button type="button" class="btn secondary" onClick={() => setStopping(false)}>Cancel</button>
        <button
          type="button"
          class="btn danger"
          disabled={busy !== null}
          onClick={async () => {
            if (await run('stop', async () => (await stopSyncing(alsoDelete), 'Sync stopped'))) setStopping(false);
          }}
        >
          {busy === 'stop' ? 'Stopping…' : 'Stop syncing'}
        </button>
      </div>
    </Sheet>
    </>
  );
}
