// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { useState } from 'preact/hooks';
import type { Place } from '../../data/openmeteo';
import { here, patchSettings, places, settings } from '../../data/store';
import { locate } from '../../data/location';
import { Sheet } from '../../components/Sheet';
import { PlaceSearch } from '../../components/PlaceSheet';
import { toast } from '../../components/Toast';

const KINDS: { value: NonNullable<Place['kind']>; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'gym', label: 'Gym' },
  { value: 'custom', label: 'Other' },
];

export function PlacesSection() {
  const s = settings.value;
  const [adding, setAdding] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const updatePlace = (id: string, p: Partial<Place>) => {
    places.value = places.value.map((x) => {
      if (x.id === id) return { ...x, ...p };
      // Only one Home, one Work, one Gym.
      if (p.kind && p.kind !== 'custom' && x.kind === p.kind) return { ...x, kind: 'custom' };
      return x;
    });
  };
  const removePlace = (id: string) => {
    places.value = places.value.filter((x) => x.id !== id);
    if (s.placeId === id) patchSettings({ placeId: places.value[0]?.id ?? (here.value ? 'here' : null) });
  };

  return (
    <>
    <h2 class="group-title">Places</h2>
    <ul class="group" style={{ listStyle: 'none', padding: 0 }}>
      {places.value.map((p) => (
        <li key={p.id} class="row-item plain" style={{ flexWrap: 'wrap' }}>
          <label class="grow">
            <span class="visually-hidden">Name for {p.detail || p.name}</span>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updatePlace(p.id, { name: e.currentTarget.value.trim() || p.name })}
              style={{ border: 0, borderBottom: '1px solid var(--line-strong)', background: 'none', width: '100%', minHeight: '32px' }}
            />
            <span class="sub" aria-hidden="true">{p.detail}</span>
          </label>
          <label>
            <span class="visually-hidden">Type of place</span>
            <select value={p.kind ?? 'custom'} onChange={(e) => updatePlace(p.id, { kind: e.currentTarget.value as Place['kind'] })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
          <button type="button" class="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => removePlace(p.id)}>×</button>
        </li>
      ))}
      <li>
        <button type="button" class="row-item plain" onClick={() => setAdding(true)}><span class="grow link">Add a place</span></button>
      </li>
      <li>
        <button
          type="button"
          class="row-item plain"
          onClick={async () => {
            setLocErr(null);
            try {
              here.value = await locate();
              patchSettings({ placeId: 'here' });
              toast('Using your location');
            } catch (e) {
              setLocErr((e as Error).message);
            }
          }}
        >
          <span class="grow link">Use my location</span>
        </button>
      </li>
    </ul>
    {locErr && <p role="alert" class="group-foot stale">{locErr}</p>}
    <p class="group-foot">Locations are rounded to about a kilometre and stay on this device.</p>
  <Sheet open={adding} title="Add a place" onClose={() => setAdding(false)}>
    <PlaceSearch
      onPick={(p) => {
        if (!places.value.some((x) => x.id === p.id)) {
          const hasHome = places.value.some((x) => x.kind === 'home');
          places.value = [...places.value, { ...p, kind: hasHome ? 'custom' : 'home' }];
        }
        setAdding(false);
        toast(`Added ${p.name}`);
      }}
    />
  </Sheet>
    </>
  );
}
