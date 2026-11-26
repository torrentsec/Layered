// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useEffect, useState } from 'preact/hooks';
import { searchPlaces, type Place } from '../data/openmeteo';
import { locate } from '../data/location';
import { here, patchSettings, places, settings } from '../data/store';
import { Sheet } from './Sheet';
import { haptic } from './haptics';

const KIND_LABEL: Record<string, string> = { home: 'Home', work: 'Work', gym: 'Gym' };

export function placeLabel(p: Place): string {
  return p.kind && KIND_LABEL[p.kind] ? `${KIND_LABEL[p.kind]} · ${p.name}` : p.name;
}

/** Debounced geocoding search; aborts the previous request as you type. */
export function usePlaceSearch(query: string, delay = 300) {
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      searchPlaces(q, ctl.signal)
        .then((r) => {
          setResults(r);
          setError(r.length ? null : 'No places match that.');
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== 'AbortError') setError(navigator.onLine ? 'Place search isn’t answering right now.' : 'You’re offline, so place search is unavailable.');
        })
        .finally(() => setBusy(false));
    }, delay);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query, delay]);
  return { results, error, busy };
}

export function PlaceSearch({ onPick, label = 'Search for a place' }: { onPick: (p: Place) => void; label?: string }) {
  const [q, setQ] = useState('');
  const { results, error, busy } = usePlaceSearch(q);
  return (
    <>
      <label class="field">
        <span>{label}</span>
        <input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="City or town" autocomplete="off" enterkeyhint="search" />
      </label>
      <p class="small-print" aria-live="polite">{busy ? 'Searching…' : error ?? ''}</p>
      {results.length > 0 && (
        <ul class="group" style={{ listStyle: 'none', padding: 0, background: 'var(--paper)' }}>
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" class="row-item plain" onClick={() => onPick(p)}>
                <span class="grow">{p.name}<span class="sub">{p.detail}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function PlaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const current = settings.value.placeId;

  const choose = (id: string) => {
    haptic();
    patchSettings({ placeId: id });
    onClose();
  };

  const useHere = async () => {
    setLocating(true);
    setErr(null);
    try {
      here.value = await locate();
      choose('here');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const addAndChoose = (p: Place) => {
    const exists = places.value.find((x) => x.id === p.id);
    if (!exists) places.value = [...places.value, { ...p, kind: 'custom' }];
    choose(p.id);
  };

  return (
    <Sheet open={open} title="Places" onClose={onClose}>
      <ul class="group" style={{ listStyle: 'none', padding: 0, background: 'var(--paper)' }}>
        <li>
          <button type="button" class="row-item plain" onClick={useHere} aria-pressed={current === 'here'}>
            <span class="grow">{locating ? 'Finding you…' : 'Use my location'}{here.value && <span class="sub">Last: {here.value.lat}, {here.value.lon}</span>}</span>
            {current === 'here' && <span aria-hidden="true">●</span>}
          </button>
        </li>
        {places.value.map((p) => (
          <li key={p.id}>
            <button type="button" class="row-item plain" onClick={() => choose(p.id)} aria-pressed={current === p.id}>
              <span class="grow">{placeLabel(p)}<span class="sub">{p.detail}</span></span>
              {current === p.id && <span aria-hidden="true">●</span>}
            </button>
          </li>
        ))}
      </ul>
      {err && <p role="alert" class="stale">{err}</p>}
      <PlaceSearch onPick={addAndChoose} label="Add a place" />
      <p class="small-print">Name places Home, Work or Gym in Settings.</p>
    </Sheet>
  );
}
