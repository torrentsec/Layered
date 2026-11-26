// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { useState } from 'preact/hooks';
import { ACTIVITIES, ACTIVITY_LABEL } from '../engine/activity';
import { LEARN_CAP, learnOffset } from '../engine/learning';
import type { Activity } from '../engine/types';
import type { Place } from '../data/openmeteo';
import { DEFAULT_SETTINGS, exportBundle, here, importBundle, patchSettings, places, ratings, settings, type Theme } from '../data/store';
import { locate } from '../data/location';
import { WEEKDAY_SHORT } from '../data/format';
import { tempDelta, type Clock, type TempUnit, type WindUnit } from '../data/units';
import { TitleBar } from '../components/TitleBar';
import { Segmented } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { PlaceSearch } from '../components/PlaceSheet';
import { toast } from '../components/Toast';

const REPO = 'https://github.com/torrentsec/Layered';
const KINDS: { value: NonNullable<Place['kind']>; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'gym', label: 'Gym' },
  { value: 'custom', label: 'Other' },
];
// Monday first, as people plan their week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Settings() {
  const s = settings.value;
  const u = s.units;
  const [adding, setAdding] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const learned = learnOffset(ratings.value, today);
  const signed = (c: number) => {
    const v = tempDelta(c, u.temp);
    return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}°`;
  };

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
      <TitleBar short="Settings" title="Settings" />
      <main>
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
                  style={{ border: 0, background: 'none', width: '100%', minHeight: '32px' }}
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

        <h2 class="group-title">Units</h2>
        <div class="card" style={{ display: 'grid', gap: '12px' }}>
          <Segmented<TempUnit> label="Temperature" value={u.temp} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} onChange={(temp) => patchSettings({ units: { ...u, temp } })} />
          <Segmented<WindUnit> label="Wind speed" value={u.wind} options={[{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }, { value: 'ms', label: 'm/s' }]} onChange={(wind) => patchSettings({ units: { ...u, wind } })} />
          <Segmented<Clock> label="Clock" value={u.clock} options={[{ value: '24', label: '24-hour' }, { value: '12', label: '12-hour' }]} onChange={(clock) => patchSettings({ units: { ...u, clock } })} />
        </div>

        <h2 class="group-title">Defaults</h2>
        <div class="group">
          <label class="row-item plain">
            <span class="grow">Activity</span>
            <select value={s.activity} onChange={(e) => patchSettings({ activity: e.currentTarget.value as Activity })}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
            </select>
          </label>
          <label class="row-item plain">
            <span class="grow">Out for</span>
            <select value={s.duration} onChange={(e) => patchSettings({ duration: Number(e.currentTarget.value) })}>
              {[2, 5, 10].map((h) => <option key={h} value={h}>{h} hours</option>)}
            </select>
          </label>
        </div>

        <h2 class="group-title">Commute</h2>
        <div class="group">
          <label class="row-item plain">
            <span class="grow">Commute mode</span>
            <input type="checkbox" class="check" checked={s.commute.enabled} onChange={(e) => patchSettings({ commute: { ...s.commute, enabled: e.currentTarget.checked } })} />
          </label>
          <label class="row-item plain">
            <span class="grow">Leave</span>
            <input type="time" value={s.commute.out} onChange={(e) => patchSettings({ commute: { ...s.commute, out: e.currentTarget.value || s.commute.out } })} />
          </label>
          <label class="row-item plain">
            <span class="grow">Head home</span>
            <input type="time" value={s.commute.back} onChange={(e) => patchSettings({ commute: { ...s.commute, back: e.currentTarget.value || s.commute.back } })} />
          </label>
          <label class="row-item plain">
            <span class="grow">Each way</span>
            <select value={s.commute.legHours} onChange={(e) => patchSettings({ commute: { ...s.commute, legHours: Number(e.currentTarget.value) } })}>
              {[1, 2].map((h) => <option key={h} value={h}>{h === 1 ? 'Up to an hour' : 'Up to two hours'}</option>)}
            </select>
          </label>
          <fieldset class="row-item plain" style={{ border: 0, margin: 0, display: 'block' }}>
            <legend class="visually-hidden">Commute days</legend>
            <div class="pick weekdays">
              {WEEK_ORDER.map((d) => (
                <button
                  type="button"
                  key={d}
                  aria-pressed={s.commute.days.includes(d)}
                  onClick={() => {
                    const days = s.commute.days.includes(d) ? s.commute.days.filter((x) => x !== d) : [...s.commute.days, d];
                    patchSettings({ commute: { ...s.commute, days } });
                  }}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <h2 class="group-title">How you run</h2>
        <div class="card">
          <label class="field" style={{ margin: 0 }}>
            <span>Manual offset: <strong class="num">{signed(s.manualOffset)}</strong></span>
            <input
              type="range"
              min={-LEARN_CAP}
              max={LEARN_CAP}
              step={0.5}
              value={s.manualOffset}
              onInput={(e) => patchSettings({ manualOffset: Number(e.currentTarget.value) })}
              aria-valuetext={`${signed(s.manualOffset)}. Lower if you feel the cold.`}
            />
          </label>
          <p class="small-print" style={{ margin: '0 0 12px' }}>Slide left if you feel the cold, right if you run warm.</p>
          <div class="row-item plain" style={{ padding: 0 }}>
            <span class="grow">Learned from your feedback<span class="sub">{ratings.value.length} rating{ratings.value.length === 1 ? '' : 's'}</span></span>
            <span class="num">{signed(learned)}</span>
            <button
              type="button"
              class="text-btn"
              disabled={!ratings.value.length}
              onClick={() => {
                ratings.value = [];
                toast('Learning reset');
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <h2 class="group-title">Appearance</h2>
        <div class="card">
          <Segmented<Theme> label="Theme" value={s.theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={(theme) => patchSettings({ theme })} />
        </div>

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

        <h2 class="group-title">About</h2>
        <div class="group">
          <a class="row-item plain" href={REPO} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span class="grow">Source code<span class="sub">AGPL-3.0-or-later</span></span>
            <span class="meta">GitHub ›</span>
          </a>
          <a class="row-item plain" href="https://open-meteo.com/" target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span class="grow">Weather data by Open-Meteo.com<span class="sub">CC BY 4.0</span></span>
            <span class="meta">›</span>
          </a>
          <div class="row-item plain">
            <span class="grow">Version</span>
            <span class="meta num">{__APP_VERSION__}</span>
          </div>
        </div>
        <p class="group-foot" style={{ textAlign: 'center', marginTop: '24px' }}>Made in London by torrentsec</p>
      </main>
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
