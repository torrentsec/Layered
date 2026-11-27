// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { LEARN_CAP, learnOffset } from '../../engine/learning';
import { patchSettings, ratings, settings } from '../../data/store';
import { tempDelta } from '../../data/units';
import { toast } from '../../components/Toast';

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
    </>
  );
}
