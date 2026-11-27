// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { LEARN_CAP, learnOffset } from '../../engine/learning';
import type { ComfortProfile, Sensitivity } from '../../engine/comfort';
import type { Level } from '../../engine/inventory';
import { comfort, patchSettings, ratings, settings } from '../../data/store';
import { tempDelta } from '../../data/units';
import { Segmented } from '../../components/Segmented';
import { toast } from '../../components/Toast';

const SENSITIVITY_OPTIONS: { value: Sensitivity; label: string }[] = [
  { value: 'cold', label: 'I feel the cold' },
  { value: 'average', label: 'Average' },
  { value: 'warm', label: 'I run warm' },
];

const LEVEL_LABEL: Record<Level, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function patchComfort(p: Partial<ComfortProfile>): void {
  comfort.value = { ...comfort.value, ...p };
}

export function SensitivityPicker() {
  return (
    <Segmented
      label="Temperature sensitivity"
      value={comfort.value.sensitivity}
      options={SENSITIVITY_OPTIONS}
      onChange={(sensitivity) => patchComfort({ sensitivity })}
    />
  );
}

function ToleranceSelect({ label, field }: { label: string; field: 'windTolerance' | 'rainTolerance' }) {
  return (
    <label class="row-item plain">
      <span class="grow">{label}</span>
      <select
        value={comfort.value[field] ?? ''}
        onChange={(e) => {
          const v = e.currentTarget.value;
          patchComfort({ [field]: v ? (v as Level) : undefined });
        }}
      >
        <option value="">Not set</option>
        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
      </select>
    </label>
  );
}

/** Optional preferences (US-005), shared with onboarding. */
export function PreferenceRows() {
  const c = comfort.value;
  return (
    <div class="group">
      <label class="row-item plain">
        <span class="grow">I overheat when walking<span class="sub">Lighter layers when you’re on the move</span></span>
        <input type="checkbox" class="check" checked={!!c.overheatWhenWalking} onChange={(e) => patchComfort({ overheatWhenWalking: e.currentTarget.checked })} />
      </label>
      <label class="row-item plain">
        <span class="grow">I get cold when still<span class="sub">Warmer layers when standing or waiting</span></span>
        <input type="checkbox" class="check" checked={!!c.coldWhenStill} onChange={(e) => patchComfort({ coldWhenStill: e.currentTarget.checked })} />
      </label>
      <ToleranceSelect label="Wind tolerance" field="windTolerance" />
      <ToleranceSelect label="Rain tolerance" field="rainTolerance" />
    </div>
  );
}

export function ComfortSection() {
  const s = settings.value;
  const u = s.units;
  const today = new Date().toISOString().slice(0, 10);
  const learned = learnOffset(ratings.value, today);
  const signed = (c: number) => {
    const v = tempDelta(c, u.temp);
    return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}°`;
  };

  return (
    <>
    <h2 class="group-title">How you run</h2>
    <SensitivityPicker />
    <p class="small-print" style={{ margin: '8px 0 12px' }}>Sets your starting point. Fine-tune it below.</p>
    <PreferenceRows />
    <div class="card" style={{ marginTop: '12px' }}>
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
    </>
  );
}
